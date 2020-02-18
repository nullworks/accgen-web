const settings = require("./settings.js");
const gmail = require("./gmail.js");

function makeid(length) {
    var result = '';
    var characters = 'abcdefghijklmnopqrstuvwxyz';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

function getEmail() {
    switch (settings.get("email_provider")) {
        case "accgen":
            return null;
        case "custom_domain":
            var custom_domain = settings.get("email_domain");
            if (custom_domain) {
                if (custom_domain.includes("@")) {
                    var email_split = custom_domain.toLowerCase().split("@");
                    return email_split[0].replace(/\./g, '') + "@" + email_split[1];
                } else
                    return makeid(10) + "@" + custom_domain.toLowerCase();
            }
        case "gmail":
        case "gmailv2":
            return settings.get("email_gmail");
        default:
            return null;
    }
}

async function getVerifyGmailv2() {
    var email = await gmail.waitForSteamEmail();
    if (!email)
        return { error: "No email recieved. Try running the gmail setup again." };
    return {
        creationid: email.split("newaccountverification?stoken=")[1].split("\n")[0].split("&creationid=")[1],
        verifylink: "https://store.steampowered.com/account/newaccountverification?stoken=" + email.split("newaccountverification?stoken=")[1].split("\n")[0]
    }
}

function stringifyQueryString(params) {
    return queryString = Object.keys(params).map(key => key + '=' + params[key]).join('&');
}

async function gmailV2DisableSteamGuard(update) {
    update("Waiting for steam guard disable email...");
    var email = await gmail.waitForSteamEmail();
    if (!email)
        return;
    var disableLink = "https://store.steampowered.com/account/steamguarddisableverification?stoken=" +
        email.split("steamguarddisableverification?stoken=")[1].split("\n")[0];
    update("Confirming steam guard disabling...");
    var res = await httpRequest({
        url: disableLink
    }, null, null).catch(function () {
        console.log(err);
    });
    return res && !res.includes("Unable to disable Steam Guard!");
}

async function generateAccount(recaptcha_solution, proxymgr, statuscb, id) {
    function update(msg, ret) {
        statuscb(msg, id, ret);
    }

    var ret = {
        success: false,
        done: true,
        account: null,
        error: {
            steamerror: null,
            message: null
        },
        id: id,
        proxymgr: proxymgr
    }

    var proxy;
    if (ret.proxymgr) {
        if (!ret.proxymgr.proxy.uri) {
            ret.error.message = ret.proxymgr.proxy.emulated ? "Account generation stopped due to a previous error." : 'No valid proxy found! Check the proxy list for banned proxies!';
            return ret;
        }
        if (ret.proxymgr.proxy.emulated)
            proxy = null;
        else
            proxy = ret.proxymgr.proxy.uri;
        console.log(ret.proxymgr)
    }

    var cookies = undefined;
    if (typeof document.toughCookie != "undefined")
        cookies = new document.toughCookie.CookieJar();

    update("Getting GID...");
    // get a fresh gid instead
    var gid = await httpRequest({
        url: "https://store.steampowered.com/join/refreshcaptcha/"
    }, proxy, cookies, 15000).catch(function () { });

    // no gid? error out
    if (!gid) {
        if (ret.proxymgr)
            ret.proxymgr.proxy.error();
        ret.error.message = !proxy ? "Invalid data recieved from steam!" : "Proxy couldn't contact Steam!";
        return ret;
    }
    console.log(gid);

    if (gid.gid)
        gid = gid.gid
    else
        gid = JSON.parse(gid).gid;

    if (typeof recaptcha_solution != "string") {
        var res = await recaptcha_solution.getCaptchaSolution(id);
        if (!res) {
            ret.error.message = 'Getting captcha solution failed. Make sure your api key is valid and your host supports a "2captcha like" api.';
            return ret;
        }
        recaptcha_solution = res;
    }

    var err = null;
    var custom_email = getEmail();
    var isClientSideGmail = settings.get("email_provider") == "gmailv2";

    if (isClientSideGmail)
        gmail.updateTimeStamp();

    update("Getting registration data...");
    var data = await new Promise(async function (resolve, reject) {
        $.ajax({
            url: '/userapi/recaptcha/addtask',
            method: 'post',
            dataType: 'json',
            contentType: 'application/json',
            data: JSON.stringify({
                step: "getdata"
            }),
            success: function (returnData) {
                resolve(returnData);
            },
            error: function (xhr, status, error) {
                console.error(xhr);
                reject(xhr.responseJSON);
            }
        });
    }).catch(function (error) {
        err = error ? error : true;
        console.log(err);
    });
    if (err) {
        if (err.error) {
            ret.error.message = err.error;
            return ret;
        }
        ret.error.message = 'Error returned by SAG backend! Check console for details!';
        return ret;
    }

    update("Waiting for confirmation from steam...");
    var ajaxverifyemail = await httpRequest({
        url: "https://store.steampowered.com/join/ajaxverifyemail",
        method: 'POST',
        data: stringifyQueryString({
            email: custom_email ? custom_email : data.email,
            captchagid: gid,
            captcha_text: recaptcha_solution
        })
    }, proxy, cookies).catch(function () {
        err = error ? error : true;
        console.log(err);
    });

    if (err) {
        ret.error.message = 'Error while creating the Steam account! Check console for details!';
        return ret;
    }
    if (ajaxverifyemail && ajaxverifyemail.success) {
        if (ajaxverifyemail.sessionid == null) {
            ret.error.message = 'Steam is limitting account creations from your IP. Try again later.';
            return ret;
        }
        if (ajaxverifyemail.success != 1) {
            ret.error.steamerror = ajaxverifyemail.success;
            return ret;
        } else {
            if (ret.proxymgr)
                ret.proxymgr.proxy.verify();
        }
    }

    var verifydata;
    if (!isClientSideGmail) {
        update("Fetching email from email server...");
        verifydata = await new Promise(function (resolve, reject) {
            $.ajax({
                url: '/userapi/recaptcha/addtask',
                method: 'post',
                dataType: 'json',
                contentType: 'application/json',
                data: JSON.stringify({
                    step: "getverify",
                    email: custom_email ? custom_email : data.email
                }),
                success: function (returnData) {
                    resolve(returnData);
                },
                error: function (xhr, status, error) {
                    console.error(xhr);
                    reject(xhr.responseJSON);
                }
            });
        }).catch(function (error) {
            err = error ? error : true;
            console.log(err);
        });
    }
    else {
        update("Fetching email from gmail...");
        var res = await getVerifyGmailv2();
        if (res.error)
            err = res;
        else
            verifydata = res;
    }
    if (err) {
        if (err.error) {
            ret.error.message = err.error;
            return ret;
        }
        ret.error.message = 'Error returned by SAG backend! Check console for details!';
        return ret;
    }

    update("Verifying email...");
    await httpRequest({
        url: verifydata.verifylink
    }, proxy, cookies).catch(function () {
        err = error ? error : true;
        console.log(err);
    });
    if (err) {
        ret.error.message = 'Error while creating the Steam account! Check console for details!';
        return ret;
    }

    update("Creating Account...");
    var createaccount = await httpRequest({
        url: "https://store.steampowered.com/join/createaccount",
        method: 'POST',
        data: 'accountname=' + data.username + '&password=' + data.password + '&count=4&lt=0&creation_sessionid=' + verifydata.creationid
    }, proxy, cookies).catch(function (error) {
        err = error ? error : true;
        console.log(err);
    });
    if (err) {
        ret.error.message = 'Error while creating the Steam account! Check console for details!';
        return ret;
    }
    if (!createaccount.bSuccess) {
        ret.error.message = 'Error while creating the Steam account! Check console for details!';
        return ret;
    }

    var disableSteamGuard = settings.get("acc_steam_guard");
    if (disableSteamGuard || settings.get("acc_apps_setting").length) {
        var apps = settings.get("acc_apps_setting").match(/\d+/g);

        ret.done = false;

        ret.account = {
            login: data.username,
            password: data.password,
            email: custom_email ? custom_email : data.email
        }

        if (disableSteamGuard && apps && apps.length > 0) {
            update("Disabling steam guard and activating " + apps.length + " app" + (apps.length === 1 ? "" : "s"), ret);
        } else if (disableSteamGuard && (!apps || apps.length <= 0)) {
            update("Disabling steam guard", ret);
        } else if (!disableSteamGuard && apps && apps.length > 0) {
            update("Activating " + apps.length + " app" + (apps.length === 1 ? "" : "s"), ret);
        } else {
            // Should never reach down here
            update("What am I doing?", ret);
        }

        ret.done = true;

        var extraTask = await new Promise(function (resolve, reject) {
            $.ajax({
                url: '/userapi/recaptcha/addtask',
                method: 'post',
                dataType: 'json',
                contentType: 'application/json',
                data: JSON.stringify({
                    step: "additional",
                    username: data.username,
                    password: data.password,
                    email: custom_email ? custom_email : data.email,
                    doSteamGuard: disableSteamGuard,
                    // Signal to worker that it should not expect steam guard disable emails in it's inbox, since these are handled on the client
                    noCheckInbox: isClientSideGmail,
                    activateApps: apps ? apps.map(a => parseInt(a)) : null
                }),
                success: function (returnData) {
                    resolve(returnData);
                },
                error: function (xhr, status, error) {
                    console.error(xhr);
                    reject(xhr.responseJSON);
                }
            });
        }).catch(function (error) {
            err = error ? error : true;
            console.log(err);
        });
        if (err) {
            if (err.error) {
                ret.error.message = err.error;
                return ret;
            }
            ret.error.message = 'Error returned by SAG backend! Check console for details!';
            return ret;
        }
        ret.account = extraTask.account;
        ret.activation = extraTask.activation;

        if (isClientSideGmail) {
            if (!await gmailV2DisableSteamGuard(update))
                if (!await gmailV2DisableSteamGuard(update)) {
                    ret.error.message = 'Unable to disable steam guard.';
                    return ret;
                }
        }

    } else {
        ret.account = {
            ...data,
            login: data.username
        };
    }

    if (ret.account && typeof post_generate != "undefined") {
        ret = await post_generate(ret, update);
    }
    if (ret.account) {
        update("Success!");
        ret.success = true;
    }
    return ret;
}

exports.activegeneration = false;

exports.generateAccounts = async function (count, proxylist, captcha, multigen, statuscb, generationcallback, change_mass_gen_status) {
    if (!multigen)
        multigen = 1;

    var accounts = [];
    var concurrent = 0;
    if (change_mass_gen_status)
        change_mass_gen_status(`Mass generation in progress... 0/${count}`);

    // Complete hack. TODO: Replace with less hacky code in the future.
    var stopped = false;
    exports.activegeneration = count;

    $(window).on("accgen.stopgeneration", function () {
        stopped = "Account generation stopped."
        change_mass_gen_status("Stopping account generation...");
    });

    for (var i = 0; i < count; i++) {
        while (concurrent >= multigen && !stopped)
            await sleep(500);
        if (stopped) {
            // Complete hack. TODO: Replace with less hacky code in the future.
            var res = {
                success: false,
                error: {
                    message: stopped
                }
            };
            accounts[i] = res;
            if (generationcallback)
                generationcallback(res, i);
            continue;
        }
        concurrent++;
        statuscb("Starting...", i);
        generateAccount(captcha, proxylist ? proxylist.getProxy() : undefined, statuscb, i).then(function (res) {
            if (generationcallback)
                generationcallback(res, res.id);
            accounts[res.id] = res;
            if (change_mass_gen_status)
                change_mass_gen_status(`Mass generation in progress... ${accounts.filter(String).length}/${count}`);
            console.log(res);
            // Complete hack. TODO: Replace with less hacky code in the future.
            if (res.error.steamerror == 17) {
                stopped = "Account generation stopped because the email domain in use is banned.";
                if (change_mass_gen_status)
                    change_mass_gen_status("Stopping account generation, email domain banned...");
            }
            concurrent--;
        }, function (err) {
            accounts.push({
                success: false,
                error: {
                    message: "Unknown error! Please send the error found in your browser console to the developers!"
                }
            })
            console.error(err);
            concurrent--;
        })
    }
    while (concurrent > 0)
        await sleep(500);
    console.log(accounts);
    exports.activegeneration = false;
    $(window).off("accgen.stopgeneration");
    return accounts;
}