"let strict";

global.$ = require("jquery");
require("bootstrap");
const isElectron = typeof (document.sagelectron || document.ipc || window.ipc) !== 'undefined';
const settings = require("./settings.js");
global.accgen_settings = settings;
const dynamic = require("./dynamicloading.js");
const generation = require("./generation.js");
const gmail = require("./gmail.js");
const CaptchaAPI = require("./lib/librecaptcha.js").CaptchaAPI;

var state = {
    addon: {
        apiversion: 0
    }
}

global.extend = function (obj, src) {
    for (var key in src) {
        if (src.hasOwnProperty(key)) obj[key] = src[key];
    }
    return obj;
}

// TODO: remove
global.httpRequest = function (options, proxy, cookies, timeout) {
    return new Promise(async function (resolve, reject) {
        $.ajax(extend({
            success: function (returnData) {
                resolve(returnData);
            },
            error: function (xhr, status, error) {
                console.error(xhr, error);
                reject(xhr.responseJSON || xhr.responseText, error);
            }
        }, options));
    });
}

// Code to communicate with the addon
var g_id = 0;
function messageAddon(data) {
    var id = g_id++;
    document.dispatchEvent(new CustomEvent("addon", { "detail": { id: id, data: data } }));
    return new Promise(function (resolve, reject) {
        document.addEventListener("addon_reply", function (event) {
            resolve(JSON.parse(event.detail).data);
        });
    });
}

global.messageAddon = messageAddon;

var gen_status_text_priority = 0;

function change_gen_status_text(text, priority) {
    if (!priority)
        priority = 0;
    if (priority >= gen_status_text_priority) {
        if (text) {
            $("#generate_status").text(text);
            gen_status_text_priority = priority;
        } else
            gen_status_text_priority = 0;
    }
}

function displayerror(errortext) {
    if (errortext) {
        $("#generic_error").show("slow");
        $("#generic_error > strong").text(errortext);
    } else
        $("#generic_error").hide("slow");
}

function parseSteamError(code, report, proxy, account) {
    var res = generation.parseSteamError(code);
    if (res.reportemail && report)
        report_email(account.email);
    return {
        error: proxy ? res.proxymessage || res.message : res.message,
        emailprovider: res.reportemail == true
    }
}

global.proxylist_edit = function () {
    import(/* webpackChunkName: "proxy" */ "./proxy.js").then(function (proxy) {
        proxy.openEditor();
    });
}

global.copyDetails = async function (id) {
    var data;
    data = $(`#${id}`).text();
    if (data == "Copied!")
        return
    var $temp = $("<input>");
    $("body").append($temp);
    $temp.val(data).select();
    document.execCommand("copy");
    $temp.remove();
    $(`#${id}`).text("Copied!");
    await sleep(1000);
    $(`#${id}`).text(data);
}

function parseErrors(data, report) {
    if (!data || (!data.success && !data.error.message && !data.error.steamerror)) {
        return "Unknown error!";
    }
    if (data.success == true)
        return;
    var returnvalue = "Unknown error!";
    // Wether or not to show the email provider switch button option
    var emailprovider = false;
    if (data.error && data.error.emailprovider)
        emailprovider = true;

    if (data.error && data.error.message)
        returnvalue = data.error.message;
    else if (data.error && data.error.steamerror) {
        var out = parseSteamError(data.error.steamerror, report, data.proxy, data.account);
        returnvalue = out.error;
        if (!emailprovider)
            emailprovider = out.emailprovider == true;
    }

    if (emailprovider)
        $("#generate_error_emailprovider").show();
    return returnvalue;
}

function registerevents() {
    var eventMethod = window.addEventListener ? "addEventListener" : "attachEvent";
    var eventer = window[eventMethod];
    var messageEvent = eventMethod == "attachEvent" ? "onmessage" : "message";

    eventer(messageEvent, async function (e) {
        if (e.origin != "https://store.steampowered.com")
            return;
        if (e.data == "recaptcha-setup")
            return;
        if (typeof e.data !== 'string' || e.data.length < 200)
            return;

        var output = null;
        // addon is out of date?
        try {
            output = JSON.parse(e.data);
        } catch (error) {
        }

        if (!output || !output.token) {
            alert("Invalid data received from addon");
            return;
        }

        change_visibility(true);
        var account = (await generation.generateAccounts(1, output, null, function statuscb(msg, id, ret) {
            change_gen_status_text(msg);
            if (ret)
                displayData(ret);
        }))[0];
        // Find errors and report banned domain if accgen email service in use
        var error = parseErrors(account, settings.get("email_provider") == "accgen");
        if (error) {
            displayData({
                parsederror: error,
                done: true
            });
            return;
        }
        displayData(account);
    }, false);
}

global.accgen_debug_gen = async function (token) {
    change_visibility(true);
    var account = (await generation.generateAccounts(1, { token }, null, function statuscb(msg, id, ret) {
        change_gen_status_text(msg);
        if (ret)
            displayData(ret);
    }))[0];
    // Find errors and report banned domain if accgen email service in use
    var error = parseErrors(account, settings.get("email_provider") == "accgen");
    if (error) {
        displayData({
            parsederror: error,
            done: true
        });
        return;
    }
    displayData(account);
}

async function doRecapV3(action) {
    await dynamic.loadRecaptchaV3();
    return await grecaptcha.execute('6LfG55kUAAAAANVoyH7VqYns6j_ZpxB35phXF0bM', {
        action: action
    });
}

function report_email(email) {
    doRecapV3("vote_email").then(function (token) {
        $.ajax({
            url: `/userapi/generator/bademail/${encodeURIComponent(token)}/${encodeURIComponent(email)}`
        }).done(function () {
            console.log("Log: email ban reported");
        })
    })
}

var electronStatusOnly;
function on_status_received(resp) {
    if (resp.electron) {
        if (resp.status)
            electronStatusOnly = true;
        else
            electronStatusOnly = false;
    } else {
        if (electronStatusOnly)
            return;
    }

    if (resp.status) {
        Promise.all([
            import(/* webpackChunkName: "status" */ "autolinker"),
            import(/* webpackChunkName: "status" */ "escape-html"),
        ]).then(([Autolinker, escape]) => {
            // Never trust anyone
            var out = escape.default(resp.status);
            out = Autolinker.default.link(out, { email: false, phone: false });
            document.getElementById("accgen_status_msg").innerHTML = out;
            $("#accgen_status").show("slow");
        });
    } else {
        $("#accgen_status").hide("slow");
    }
}

function perform_status_check() {
    $.ajax({
        url: "/api/v1/status"
    }).done(function (resp) {
        on_status_received(resp)
    })
}

global.sleep = function (ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function isMobile() {
    var check = false;
    (function (a) {
        if (/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a) || /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0, 4))) check = true;
    })(navigator.userAgent || navigator.vendor || window.opera);
    return check;
};

function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

}

function GetBrowser() {
    if (typeof InstallTrigger !== 'undefined')
        return "Firefox";
    if (!!window.chrome && (!!window.chrome.webstore || !!window.chrome.runtime))
        return "Chrome";
    var isIE = /*@cc_on!@*/ false || !!document.documentMode;
    if (isIE && !!window.StyleMedia)
        return "Edge";
    if ((!!window.opr && !!opr.addons) || !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0)
        return "Opera";
    return "Unsupported";
}

function AddonsNotSupported() {
    window.location = "legacy.html";
}

function changeText(is_electron) {
    if (is_electron) {
        $("#email_service_option_gmail > img")
            .css("opacity", "0.4")
            .css("filter", "alpha(opacity=40)");
        $("#email_service_option_gmail > figcaption > p").html('Automated Gmail support is not available on the electron app. <a href="https://accgen.cathook.club/gitlab/wikis/Using-Your-Gmail-address-with-Steam-Account-Generator" target="_blank">Guide for manually using gmail.</a>');
        return;
    }
    switch (GetBrowser()) {
        case "Firefox":
            if (isIOS())
                return AddonsNotSupported("Firefox IOS")
            document.getElementById("addon_download_text").textContent = "You don't have our Firefox addon yet!";
            document.getElementById('ffaddon').href = 'https://addons.mozilla.org/firefox/addon/sag/';
            document.getElementById('ffaddon').target = "_blank";
            document.getElementById('ffaddon').onclick = "";
            break;
        case "Chrome":
            if (isMobile())
                return AddonsNotSupported("Chrome Mobile");
            document.getElementById("addon_download_text").textContent = "You don't have our Chrome addon yet!";
            document.getElementById('ffaddon').href = 'https://chrome.google.com/webstore/detail/sag/piljlfgibadchadlhlcfoecfbpdeiemd';
            document.getElementById('ffaddon').target = "_blank";
            document.getElementById('ffaddon').onclick = "";
            break;
        case "Opera":
            if (isMobile())
                return AddonsNotSupported();
            document.getElementById("addon_download_text").textContent = "You don't have our Opera addon yet!";
            document.getElementById('ffaddon').href = 'https://addons.opera.com/en/extensions/details/sag/';
            document.getElementById('ffaddon').target = "_blank";
            document.getElementById('ffaddon').onclick = "";
            break;
        case "Yandex":
            if (isIOS())
                return AddonsNotSupported("Yandex IOS")
            document.getElementById("addon_download_text").textContent = "You don't have our Yandex addon yet!";
            document.getElementById('ffaddon').href = 'https://chrome.google.com/webstore/detail/sag/piljlfgibadchadlhlcfoecfbpdeiemd';
            document.getElementById('ffaddon').target = "_blank";
            document.getElementById('ffaddon').onclick = "";
            break;
        default:
            return AddonsNotSupported();
    }
}

/*Automatic generation*/
global.mass_generate_clicked = async function () {
    // Inline to limit scope
    function alter_table(id, data) {
        if (isNaN(id)) {
            console.error("Invalid ID");
            return;
        }

        if (data.username) $('#status_table tr').eq(id).find('td').eq(1).html(data.username);
        if (data.password) $('#status_table tr').eq(id).find('td').eq(2).html(data.password);
        if (data.email) $('#status_table tr').eq(id).find('td').eq(3).html(data.email);
        if (data.status) $('#status_table tr').eq(id).find('td').eq(4).html(data.status);
    }

    // Get accounts to generate (count)
    var max_count = $("#mass_gen_count").val();
    var concurrency = $("#mass_gen_concurrency").val();
    if (!max_count || isNaN(max_count) || max_count < 1) {
        displayerror("Count must be a non 0 and non negative number!");
        return false;
    }
    if (!concurrency || isNaN(concurrency) || concurrency < 1) {
        displayerror("Concurrency must be a non 0 and non negative number!");
        return false;
    }

    $("#status_table").empty();
    // Preallocate table
    for (var i = 0; i < max_count; i++)
        $("#status_table").append(
            `<tr>
            <td>${i}</td>
            <td></td>
            <td></td>
            <td></td>
            <td>Waiting...</td>
            </tr>`
        );

    // Show progress bar and hide other things
    change_visibility(true);
    $('#generate_stop').show();
    $("#generation_status").show("slow");

    function statuscb(msg, id) {
        alter_table(id, {
            status: msg
        });
    }

    var captcha = CaptchaAPI(settings.get("captcha_host"), settings.get("captcha_key"), isElectron && document.sagelectron.nodefetch ? document.sagelectron.nodefetch : fetch);

    function generationcallback(account, id) {
        var error = parseErrors(account, settings.get("email_provider") == "accgen");
        if (error) {
            alter_table(id, {
                status: error
            })
            return;
        }
        alter_table(id, {
            status: "Finished!",
            username: account.account.login,
            password: account.account.password,
            email: account.account.email
        });
        addToMassHistory(account.account);
    }

    var valid_accounts = [];
    var accounts = await generation.generateAccounts(max_count, captcha, concurrency, statuscb, generationcallback, change_gen_status_text, $("#proxy_check:checked").val() && isElectron);
    for (var i = 0; i < max_count; i++) {
        var account = accounts[i];
        var error = parseErrors(account, false);
        if (error) {
            alter_table(i, {
                username: "",
                password: "",
                email: "",
                status: error
            })
            continue;
        }
        alter_table(i, {
            status: "Completed!",
            username: account.account.login,
            password: account.account.password,
            email: account.account.email
        })
        if (account.account)
            valid_accounts.push(account.account);
    }
    change_visibility(false);
    if ($("#down_check:checked").val() && valid_accounts.length >= 1)
        download_account_list(valid_accounts);
    return false;
}

/*Automatic generation end*/

global.commonGeneratePressed = async function () {
    if (settings.get("captcha_key")) //2captcha key is set
    {
        change_visibility(2);
        $("#mass_generator").modal('show');
        return;
    }
    // Check if we support the new feature or not
    if (state.addon.apiversion >= 6 && settings.get("captcha_mode") === "native") {
        change_visibility(true);
        var account = (await generation.generateAccounts(1, {
            getRecapSolution: async () => {
                // Token + GID returned by this
                // TODO: Handle tab close, so we aren't waiting forever
                var out = JSON.parse(await messageAddon({ task: "nativeCaptcha" }));
                return out;
            },
            message: "Waiting for you to solve the captcha..."
        }, null, function statuscb(msg, id, ret) {
            change_gen_status_text(msg);
            if (ret)
                displayData(ret);
        }))[0];
        // Find errors and report banned domain if accgen email service in use
        var error = parseErrors(account, settings.get("email_provider") == "accgen");
        if (error) {
            displayData({
                parsederror: error,
                done: true
            });
            return;
        }
        displayData(account);
    }
    else {
        if ($("#steam_iframe").is(":hidden")) {
            change_visibility(2);
            document.getElementById('steam_iframe_innerdiv').src = "https://store.steampowered.com/join/";
        }
        else
            document.getElementById('steam_iframe_innerdiv').src = "about:blank";
        $("#steam_iframe").toggle("slow");
    }
}

global.selectEmailServicePressed = function () {
    dynamic.loadEmailServiceImages();
    $("#email_service_modal").modal('show');
}

global.commonChangeVisibility = function (pre_generate) {
    if (pre_generate) {
        $('#mx_error').hide("slow");
        $('#gmail_error').hide("slow");
        $('#saved_success').hide("slow");
        $('#twocap_error').hide("slow");
        $('#generate_error').hide("slow");
        $("#generate_error_emailprovider").hide("slow");
        $('#generated_data').hide("slow");
        $('#history_list').hide("slow");
        $("#generation_status").hide("slow");
        $('#generate_stop').hide("slow");
        displayerror(undefined);

        // Unload the steam recaptcha
        $('#steam_iframe').hide("slow");
        document.getElementById('steam_iframe_innerdiv').src = "about:blank";

        if (pre_generate == 1) {
            $('#control_buttons').hide();
            $('#generate_progress').show("slow");
        }
    } else {
        $('#control_buttons').show();
        $('#generate_progress').hide("slow");
    }
}

function addToHistory(acc_data) {
    if (localStorage.getItem("genned_account") == null) {
        localStorage.setItem("genned_account", JSON.stringify([]))
    }
    localStorage.setItem("genned_account", JSON.stringify(JSON.parse(localStorage.getItem("genned_account")).concat(acc_data)));
}

function addToMassHistory(acc_data) {
    if (localStorage.getItem("mass_genned_account") == null) {
        localStorage.setItem("mass_genned_account", JSON.stringify([]))
    }
    localStorage.setItem("mass_genned_account", JSON.stringify(JSON.parse(localStorage.getItem("mass_genned_account")).concat(acc_data)));
}

var lastacc;

function displayData(acc_data) {
    if (acc_data.done)
        change_visibility(false);

    if (acc_data.parsederror) {
        $("#generate_error").show("slow")
        $("#generate_error_text").html(acc_data.parsederror)
        return;
    }

    if (acc_data.done)
        addToHistory(acc_data.account);
    lastacc = acc_data;

    if (typeof document.sagelectron != "undefined") {
        $("#electron_steam_signin").show();
    }

    if (acc_data.activation) {
        $("#acc_apps > span > strong").text(acc_data.activation.success.length + "/" + (acc_data.activation.success.length + acc_data.activation.fail.length));
        $("#acc_apps").show();
    } else {
        $("#acc_apps").hide();
    }

    $("#details_username").text(acc_data.account.login);
    $("#details_password").text(acc_data.account.password);

    $("#generated_data").show("slow");
}

global.electronSteamSignIn = function () {
    document.sagelectron.startSteam(lastacc);
    $("#electron_steam_signin").hide("slow");
}

async function isvalidmx(domain) {
    var patt = new RegExp("^([a-z0-9]+([\-a-z0-9]*[a-z0-9]+)?\.){0,}([a-z0-9]+([\-a-z0-9]*[a-z0-9]+)?){1,63}(\.[a-z0-9]{2,7})+$");
    if (!patt.test(domain))
        return false;
    var out = await fetch(`/userapi/generator/mxcheck/${encodeURIComponent(domain)}`).catch(() => { });
    if (!out || !out.ok) {
        return "Unknown error while chcking domain validity!";
    }
    try {
        var json = await out.json();
        if (json.valid) {
            return true;
        }
        return json.error;
    } catch (error) {
        return "Unknown error while chcking domain validity!";
    }
}

function appSettingsInfo() {
    var rawApps = $("#settings_appids").val().match(/\d+(,$|)/g);
    if (!rawApps) {
        $("#acc_apps_setting > div > span").text("0");
        $("#acc_apps_setting > div").addClass("alert-warning");
        $("#acc_apps_setting > div").removeClass("alert-success");
        return;
    }

    $("#settings_appids").val(rawApps.join(","));

    var apps = $("#settings_appids").val().match(/\d+/g);

    $("#acc_apps_setting > div > span").text(apps.length);

    if (apps.length > 5) {
        $("#acc_apps_setting > div").addClass("alert-warning");
        $("#acc_apps_setting > div").removeClass("alert-success");
    } else {
        $("#acc_apps_setting > div").addClass("alert-success");
        $("#acc_apps_setting > div").removeClass("alert-warning");
    }
}

var lock_email_service_selection = false;

async function setProvider(provider) {
    settings.set("email_provider", provider);
    setTimeout(() => {
        $("#email_service_modal").modal('hide');
        $("#email_service_message").hide('slow');
        setTimeout(() => {
            lock_email_service_selection = false;
        }, 1000);
    }, 3000);
}

// TODO: These globals are terrible. Fix this shit, probably move it to another js file.
global.setUseAccgenMail = function () {
    if (lock_email_service_selection)
        return;
    lock_email_service_selection = true;
    $("#email_service_message > strong").text("Using accgen email service.");
    $("#email_service_message").show('slow');
    setProvider("accgen");
}

global.setUseGmail = async function () {
    if (isElectron)
        return;
    if (lock_email_service_selection)
        return;
    lock_email_service_selection = true;
    console.log("Setup gmail clicked");
    //show progress bar
    $("#email_service_progress").show('slow');
    $("#email_service_message > strong").text("Setting up gmail forwarding...");
    $("#email_service_message").show('slow');
    var result = await messageAddon({ task: "setupGmail" });
    console.log(result)
    if (!result.success) {
        $("#email_service_progress").hide('slow');
        $("#email_service_message > strong").text(`There was an issue setting up Gmail: ${result.reason || result.error}`)
        lock_email_service_selection = false;
        return;
    }
    var address = await gmail.getGmailAddress();
    $("#email_service_progress").hide('slow');
    if (!address || address.error) {
        if (address && address.error == 401) {
            $("#email_service_message > strong").html(`There was an issue setting up automated Gmail: Failed to login. Please open <a href="https://mail.google.com">mail.google.com</a>, wait for it to load (and login if necessary), then try again.<br>If the issue persists, follow this guide to manually setup gmail forwarding: <a href="https://accgen.cathook.club/gitlab/wikis/Using-Your-Gmail-address-with-Steam-Account-Generator" target="_blank">Using your Gmail address with forwarding</a>`);
        } else {
            if (GetBrowser() == "Firefox")
                $("#email_service_message > strong").html(`There was an issue setting up automated Gmail: Communication with gmail failed. Please disable "enhanced privacy protection" for this page (shield icon next to the padlock in the address bar).<br>If the issue persists, follow this guide to manually set up gmail forwarding: <a href="https://accgen.cathook.club/gitlab/wikis/Using-Your-Gmail-address-with-Steam-Account-Generator" target="_blank">Using your Gmail address with forwarding</a>`);
            else
                $("#email_service_message > strong").html(`There was an issue setting up automated Gmail: Communication with gmail failed.<br>If the issue persists, follow this guide to manually setup gmail forwarding: <a href="https://accgen.cathook.club/gitlab/wikis/Using-Your-Gmail-address-with-Steam-Account-Generator" target="_blank">Using your Gmail address with forwarding</a>`);
        }
        lock_email_service_selection = false;
        return;
    }
    settings.set("email_gmail", address);
    setProvider("gmailv2");

    $("#email_service_message > strong").text(`Automated gmail forwarding was set up for ${address}.`)
}

var changeurl_url = null;
global.changeurl = function (exit) {
    if (!exit)
        changeurl_url = window.event.target.href;
    else
        changeurl_url = "exit"
    if (generation.generator.activegeneration) {
        if (generation.generator.activegeneration > 1)
            $("#exit_page_modal_graceful").show();
        else
            $("#exit_page_modal_graceful").hide();
        if (exit) {
            if (!isElectron)
                $("#exit_page_modal_exit").hide();
            exit.preventDefault();
            exit.returnValue = '';
        }
        else
            $("#exit_page_modal_exit").show();
        $("#exit_page_modal").modal("show");
        return false;
    }
    return true;
}

global.common_init = async function () {
    // Convert configs from older to newer versions
    settings.convert();

    setInterval(perform_status_check, 10000);
    perform_status_check();

    // Check addon install status and version of addon and take appropriate action
    // Enable extra electron features
    if (isElectron) {
        var ipc = (document.sagelectron ? document.sagelectron.ipc : null) || document.ipc || window.ipc;
        if (ipc) {
            ipc.on('alert-msg', (event, arg) => {
                on_status_received(arg);
            });
            ipc.send("ready");
            console.log("Ready sent!");
        }
        // Electron app needs to be updated to continue
        if (typeof document.sagelectron === "undefined" || document.sagelectron.apiversion < 4) {
            $("#electron_update").show();
            $("#accgen_ui").hide();
            return;
        }
        $("#electron_ad").hide();
        $("#proxy-settings").show();

        // Electron app does not support gmail.
        changeText(true);
    }
    else {
        var addoncheck = await Promise.race([
            messageAddon({ task: "version" }),
            // Auto respond if it takes longer than 500 ms
            new Promise(function (resolve, reject) {
                setTimeout(resolve, 500);
            })
        ]);
        if (addoncheck) {
            console.log("Version 3.0 or above found!")
            state.addon.apiversion = addoncheck.apiversion;
        }
        // Version older than 3.0 or not installed and not electron
        else {
            changeText();
            $("#addon_dl").show();
            $("#accgen_ui").hide();
            console.log("No addon installed!");
            return;
        }
    }

    if (localStorage.getItem("genned_account") != null) {
        $('#history_button').show();
    }

    registerevents();

    if (!settings.get("email_provider"))
        selectEmailServicePressed();

    // Add generator stop events and exit events
    $('#generate_stop > button').click(function () {
        $('#generate_stop').hide("slow");
        generation.generator.events.emit("stopgeneration");
    });
    $("#exit_page_modal_graceful").click(function () {
        generation.generator.events.emit("stopgeneration");
    });
    $("#exit_page_modal_exit").click(function () {
        generation.generator.activegeneration = false;
        if (changeurl_url == "exit")
            window.close();
        else
            window.location = changeurl_url;
    });
    window.addEventListener('beforeunload', function (e) {
        global.changeurl(e);
    });


    appSettingsInfo();
    $("#settings_appids").on("input", appSettingsInfo);
}

function displayhistorylist(data, showdownloadhistory) {
    var shouldshow = data ? true : false;
    if (shouldshow) {
        change_visibility(2);
        $("#genned_accs").empty();
        $.each(data.reverse(), function (i, item) {
            $('<tr class="table-primary">').html(
                "<td>" + "<a target=\"_blank\" href=\"https://steamcommunity.com/profiles/" + item.steamid + "\">" + item.login + "</a></td><td>" + item.password + "</td>").appendTo('#genned_accs');
        })
    }
    if (shouldshow) {
        $("#history_list").show('slow');
        if (showdownloadhistory)
            $("#history_download_button").show();
        else
            $("#history_download_button").hide();
    } else
        $("#history_list").hide('slow');
}

global.history_pressed = function () {
    if ($("#history_list").is(":hidden"))
        displayhistorylist(JSON.parse(localStorage.getItem("genned_account")), true);
    else
        displayhistorylist(undefined);
    return false;
}

//https://stackoverflow.com/a/45831280
function download(filename, text) {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();
    document.body.removeChild(element);
}

function download_account_list(accounts) {
    var s = "";
    for (var i = 0; i < accounts.length; i++) {
        s += (accounts[i].login + ":" + accounts[i].password) + "\r\n";
    }

    var date = new Date();
    download(`accounts–${date.getFullYear()}-${date.getMonth() < 10 ? "0" + date.getMonth() : date.getMonth()}-${date.getDate() < 10 ? "0" + date.getDate() : date.getDate()}.txt`, s);
}

global.history_download_pressed = function () {
    download_account_list(JSON.parse(localStorage.getItem("genned_account")));
    return false;
}

global.settings_help = function (page) {
    switch (page) {
        case "gmail":
            window.open("https://accgen.cathook.club/gitlab/wikis/Using-Your-Gmail-address-with-Steam-Account-Generator");
            break;
        case "mx":
            window.open("https://accgen.cathook.club/gitlab/wikis/How-to-set-up-a-Custom-Domain");
            break;
        case "f2pgames":
            window.open("https://accgen.cathook.club/gitlab/wikis/How-to-use-SubIDs");
            break;
        default:
            console.log("Invalid settings page");
            break;

    }
}

global.settings_pressed = function () {
    change_visibility(2);
    $("#settings_custom_domain").val(settings.get("email_domain"));
    $("#settings_twocap").val(settings.get("captcha_key"));
    $("#settings_caphost").val(settings.get("captcha_host"));
    $("#acc_steam_guard > input[type=\"checkbox\"]").prop("checked", settings.get("acc_steamguard"));
    $("#acc_apps_setting > input[type=\"text\"]").val(settings.get("acc_apps"));
    $("#settings_appids").trigger("input");
    $("#settings_captchamode").prop('selectedIndex', settings.get("captcha_mode") === "native" ? 0 : 1);
    return false;
}

global.custom_domain_clicked = async function () {
    if (lock_email_service_selection)
        return false;
    lock_email_service_selection = true;
    $('#custom_domain_service_modal').modal('show');
}

global.save_domain = async function () {
    $("#email_service_progress").show('slow');
    $("#email_service_message > strong").text("Setting up custom domain...");
    $("#email_service_message").show('slow');
    var custom_domain = $("#settings_custom_domain").val();
    if (custom_domain == "") {
        //settings.set("email_domain", null);
        lock_email_service_selection = false;
        $("#email_service_message").hide('slow');
        $("#email_service_progress").hide('slow');
        settings.set("email_domain", custom_domain);
    } else {
        if (custom_domain.includes("@")) {
            $("#email_service_message > strong").text("That's an email - not a domain.");
            $("#email_service_progress").hide('slow');
            return false;
        } else {
            var mxcheck = await isvalidmx(custom_domain)
            if (mxcheck !== true) {
                $("#settings_custom_domain").val("");
                lock_email_service_selection = false;
                $("#email_service_message > strong").text(mxcheck);
                $("#email_service_progress").hide('slow');
                return false;
            }
        }
        $("#email_service_progress").hide('slow');
        settings.set("email_domain", custom_domain);
        $("#email_service_message > strong").text("Custom domain set up.");
        setProvider('custom_domain');
    }
}

global.save_clicked = async function () {
    settings.set("acc_steamguard", $("#acc_steam_guard > input[type=\"checkbox\"]").prop("checked"));
    settings.set("acc_apps", $("#acc_apps_setting > input[type=\"text\"]").val());
    settings.set("captcha_mode", $("#settings_captchamode").prop('selectedIndex') === 0 ? "native" : "iframe");

    var captcha_key = $("#settings_twocap").val();
    var captcha_host = ($("#settings_caphost").val() != '') ? $("#settings_caphost").val() : "https://2captcha.com";
    if (captcha_key != "") {
        var check = await CaptchaAPI(captcha_host, captcha_key, isElectron && document.sagelectron.nodefetch ? document.sagelectron.nodefetch : fetch).isValidKey()
        if (check) {
            $("#twocap_error > strong").text("Captcha service setup error: " + check.error);
            $("#twocap_error").show("slow");
            return;
        }
        $("#twocap_error").hide("slow");
        settings.set("captcha_key", captcha_key);
        settings.set("captcha_host", captcha_host);
    } else {
        $("#twocap_error").hide("slow");
        settings.set("captcha_key", null);
    }
    $("#saved_success").show("slow");
    return false;
}

// https://stackoverflow.com/a/46932935
$('.modal').on("hidden.bs.modal", function (e) {
    if ($('.modal:visible').length) {
        $('body').addClass('modal-open');
    }
});
