const EventEmitter = require("events");
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

class Generator {
    // Parameter definitions can be found above
    constructor(steam_getGid, steam_requestVerify, steam_verifyEmail, steam_createAccount, gen_getData, gen_getVerify, gen_doAdditional) {
        /** Functions **/

        /*Steam Expected output: base response object + direct steam output*/
        // Get up to date GID from steam, expected input: standard compliant fetch function
        this.steam_getGid = steam_getGid;
        // Request verification email from steam, expected input: standard compliant fetch function, email, gid, recaptcha token
        this.steam_requestVerify = steam_requestVerify;
        // Click verification link, expected input: standard compliant fetch function, verify link
        this.steam_verifyEmail = steam_verifyEmail;
        // Create steam account, expected input: standard compliant fetch function, username, password, creationid from verification email
        this.steam_createAccount = steam_createAccount;

        /*Accgen/Misc Expected output: base response object*/
        // Expected output: username, password, email
        this.gen_getData = gen_getData;
        // Get data from steam verification email; Expected input: email address; Expected output: object containing creationid and verifylink
        this.gen_getVerify = gen_getVerify;
        // Optional endpoint for disabling steam guard and adding apps, Expected input: username, password, email, doSteamGuard, apps; Expected output: login (username), password, email, steamid
        this.gen_doAdditional = gen_doAdditional;

        /** End of functions **/

        this.events = new EventEmitter();

        // Amount of currently active generations. Useful for page exiting/handling sigint.
        this.activegeneration = 0;
    }

    // Should be considered as a "private" function. Don't call directly. Use generateAccounts instead.
    async generateAccount(recaptcha_solution, statuscb, id, settings, steamfetch, usingproxy) {
        function update(msg, ret) {
            statuscb(msg, id, ret);
        }

        // Object that will eventually be returned
        var ret = {
            success: false,
            done: true,
            account: null,
            error: {
                steamerror: null,
                message: null,
                emailprovider: false
            },
            id: id,
            proxy: usingproxy
        }

        // Librecaptcha compatibility
        if (typeof recaptcha_solution.getRecapSolution == "function") {
            if (typeof recaptcha_solution.message == "string") {
                update(recaptcha_solution.message);
            }
            else
                update("Getting captcha solution... This may take some time.");
            var res = await recaptcha_solution.getRecapSolution();
            if (res.error) {
                ret.error.message = "Error while getting captcha solution! " + res.error;
                return ret;
            }

            recaptcha_solution = { token: res.token, gid: res.gid };
        }


        if (typeof recaptcha_solution.gid == "undefined") {
            update("Getting GID...");
            var gid = await this.steam_getGid(steamfetch);

            // no gid? error out
            if (!gid.success) {
                switch (gid.error.type) {
                    case "network":
                        ret.error.message = "Connection to steam failed.";
                        break;
                    case "http":
                        ret.error.message = "Error returned by steam on GID refresh.";
                        break;
                    default:
                        break;
                }
                return ret;
            }
            recaptcha_solution.gid = gid.response.gid;
        }

        update("Getting registration data...");
        var acc_data = await this.gen_getData();
        if (!acc_data.success) {
            ret.error.message = acc_data.error.message || 'Error returned by SAG backend! Check console for details!';
            return ret;
        }
        acc_data = acc_data.response;
        ret.account = acc_data;

        var email = acc_data.email;

        update("Waiting for confirmation from steam...");
        {
            var response = await this.steam_requestVerify(steamfetch, email, recaptcha_solution.gid, recaptcha_solution.token);
            if (!response.success) {
                switch (response.error.type) {
                    case "network":
                        ret.error.message = "Connection to steam failed.";
                        break;
                    case "http":
                        ret.error.message = "Error returned by steam on verify request.";
                        break;
                    case "steam":
                        ret.error.steamerror = response.error.steamcode;
                    default:
                        break;
                }
                return ret;
            }
        }

        var verifydata;
        {
            update("Fetching email...");
            var response = await this.gen_getVerify(email);
            if (!response.success) {
                ret.error.message = response.error.message || 'Error returned by SAG backend! Check console for details!';
                if (response.error.type == "email")
                    ret.error.emailprovider = true;
                return ret;
            }
            verifydata = response.response;
        }

        update("Verifying email...");
        {
            var request = await this.steam_verifyEmail(steamfetch, verifydata.verifylink);
            if (!request.success) {
                ret.error.message = 'Error while creating the Steam account! Check console for details!';
                console.log(request);
                return ret;
            }
        }

        update("Creating Account...");
        {
            var response = await this.steam_createAccount(steamfetch, acc_data.username, acc_data.password, verifydata.creationid);
            if (!response.success) {
                switch (response.error.type) {
                    case "network":
                        ret.error.message = "Connection to steam failed.";
                        break;
                    case "http":
                        ret.error.message = "Error returned by steam on account create request.";
                        break;
                    case "steam":
                        ret.error.message = "Creation of account failed. Check console for details!";
                        console.log(response.response);
                    default:
                        break;
                }
                return ret;
            }
        }

        var disableSteamGuard = settings.acc_steamguard;
        var apps = settings.acc_apps.match(/\d+/g);
        if ((disableSteamGuard || apps.length) && this.gen_doAdditional) {
            ret.done = false;

            ret.account = {
                login: acc_data.username,
                password: acc_data.password,
                email: email
            }

            if (disableSteamGuard && apps && apps.length > 0) {
                update("Disabling steam guard and activating " + apps.length + " app" + (apps.length === 1 ? "" : "s"), ret);
            } else if (disableSteamGuard && (!apps || apps.length <= 0)) {
                update("Disabling steam guard", ret);
            } else if (!disableSteamGuard && apps && apps.length > 0) {
                update("Activating " + apps.length + " app" + (apps.length === 1 ? "" : "s"), ret);
            } else {
                // Should never reach down here
                update("If you see this, it's a bug!", ret);
            }

            ret.done = true;

            {
                var response = await this.gen_doAdditional(acc_data.username, acc_data.password, email, disableSteamGuard, apps);
                if (!response.success) {
                    ret.error.message = response.error.message || 'Error returned by SAG backend! Check console for details!';
                    return ret;
                }
                ret.account = response.response.account;
                ret.activation = response.response.activation;
            }

        } else {
            acc_data.login = acc_data.username;
            delete acc_data.username;
            ret.account = acc_data;
        }
        if (ret.account) {
            update("Success!");
            ret.success = true;
        }
        return ret;
    }
    /*
    count: Number of accounts to generate
    captcha: Either text (single gen) or an object containing a function called getRecapSolution
    multigen: amount of accounts to generate concurrently
    generationcallback: function taking parameter "account" and "id", optional
    change_mass_gen_status: function taking text as paramter. Should be displayed to the user somewhere. Required if count > 1
    settings: object containing properties acc_steamguard and acc_apps
    */
    async generateAccounts(fetch, handleErrors, count, captcha, multigen, statuscb, generationcallback, change_mass_gen_status, settings, getProxy) {
        if (!multigen)
            multigen = 1;

        var accounts = [];
        var concurrent = 0;
        if (change_mass_gen_status)
            change_mass_gen_status(`Mass generation in progress... 0/${count}`);

        // Complete hack. TODO: Replace with less hacky code in the future.
        var stopped = false;
        this.activegeneration = count;

        this.events.once("stopgeneration", function () {
            stopped = "Account generation stopped."
            change_mass_gen_status("Stopping account generation...");
        })

        for (var i = 0; i < count; i++) {
            while (concurrent >= multigen && !stopped)
                await sleep(500);
            var proxy = null;
            if (getProxy && !stopped) {
                statuscb("Waiting for valid proxy...", i);
                proxy = await getProxy();
                if (!proxy)
                    stopped = "No available proxies found.";
            }
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
            this.generateAccount(captcha, statuscb, i, settings, proxy ? proxy.fetch : fetch, proxy ? true : false).then(function (res) {
                if (generationcallback)
                    generationcallback(res, res.id);
                accounts[res.id] = res;
                if (change_mass_gen_status)
                    change_mass_gen_status(`Mass generation in progress... ${accounts.filter(String).length}/${count}`);
                // Handle any errors that may appear, ban proxies and cancel generation if necessary
                var cancel = handleErrors(res, proxy ? proxy.proxy : null);
                if (cancel && !stopped) {
                    stopped = cancel;
                    if (change_mass_gen_status)
                        change_mass_gen_status("Stopping account generation...");
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
        this.activegeneration = false;
        this.events.removeAllListeners("stopgeneration");
        return accounts;
    }

    // Functiono intended to be used for generating accounts automatically in a nodejs context
    async autogen(fetch, handleErrors, captcha, multigen, statuscb, generationcallback, change_mass_gen_status, settings, getProxy) {
        if (!multigen)
            multigen = 1;

        var concurrent = 0;
        if (change_mass_gen_status)
            change_mass_gen_status(`Automatic generation in progress...`);

        // Complete hack. TODO: Replace with less hacky code in the future.
        var stopped = false;
        this.activegeneration = true;

        var i = -1;

        while (!stopped) {
            i++;
            while (concurrent >= multigen)
                await sleep(500);
            var proxy = null;
            if (getProxy && !stopped) {
                statuscb("Waiting for valid proxy...", i);
                proxy = await getProxy();
                if (!proxy)
                    stopped = "No available proxies found.";
            }
            concurrent++;
            statuscb("Starting...", i);
            this.generateAccount(captcha, statuscb, i, settings, proxy ? proxy.fetch : fetch, proxy ? true : false).then(function (res) {
                if (generationcallback)
                    generationcallback(res, res.id);
                // Handle any errors that may appear, ban proxies and cancel generation if necessary
                var cancel = handleErrors(res, proxy ? proxy.proxy : null);
                if (cancel && !stopped) {
                    stopped = cancel;
                    if (change_mass_gen_status)
                        change_mass_gen_status("Stopping account generation...");
                }
                concurrent--;
            }, function (err) {
                console.error(err);
                concurrent--;
            })
            await sleep(1000);
        }
        while (concurrent > 0)
            await sleep(500);
        change_mass_gen_status("Stopped account generation. Reason: " + stopped);
        this.activegeneration = false;
    }
}

exports.Generator = Generator;
