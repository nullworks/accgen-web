function errorToText(error) {
    // Capmonster may add a space after certain errors
    error = error.split(" ")[0];
    switch (error) {
        case "ERROR_WRONG_USER_KEY":
        case "ERROR_KEY_DOES_NOT_EXIST":
            return "Your captcha solving service API key is invalid. Please verify the API key is correct.";
        case "ERROR_ZERO_BALANCE":
            return "Zero balance at captcha solving service. Please add funds.";
        case "ERROR_CAPTCHA_UNSOLVABLE":
        case "ERROR_RECAPTCHA_TIMEOUT":
            return "Your captcha solving service was unable to solve the captcha.";
        default:
            return "Captcha solving service sent: " + error;
    }
}

async function checkBalance(url, key, fetch) {
    try {
        var balance_res = await fetch(`${url}/res.php?key=${key}&action=getbalance&header_acao=1`);
    } catch (error) {
        return { success: false, error: "Failed to connect to captcha solving service." };
    }

    if (!balance_res.ok)
        return { success: false, error: "Error getting captcha solving service balance." };

    balance_res = await balance_res.text();

    if (isNaN(balance_res))
        return { success: false, error: errorToText(balance_res) };

    if (balance_res == "0")
        return { success: false, error: errorToText("ERROR_ZERO_BALANCE") };

    return false;
}

async function get2CapSolution(key, url, fetch) {
    var balcheck = await checkBalance(url, key, fetch);
    if (balcheck)
        return balcheck;

    try {
        var solve_req = await fetch(`${url}/in.php?key=${key}&method=userrecaptcha&googlekey=6LdIFr0ZAAAAAO3vz0O0OQrtAefzdJcWQM2TMYQH&pageurl=https://store.steampowered.com/join/&header_acao=1&soft_id=2370&json=1&enterprise=1`);
    } catch (error) {
        return { success: false, error: "Failed to connect to captcha solving service." }
    }

    if (!solve_req.ok)
        return { success: false, error: "Error sending captcha solving request." }

    try {
        solve_req = await solve_req.clone().json()
    } catch (e) {
        solve_req = await solve_req.text();
        return { success: false, error: errorToText(solve_req) }
    }

    if (!solve_req.request)
        return { success: false, error: "Captcha solving service sent invalid json!" }

    for (var i = 0; i < 30; i++) {
        await sleep(5000);
        try {
            var polling_res = await fetch(`${url}/res.php?key=${key}&action=get&id=${solve_req.request}&json=1&header_acao=1`);
        } catch (error) {
            return { success: false, error: "Failed to connect to captcha solving service." }
        }
        try {
            polling_res = await polling_res.clone().json()
        } catch (e) {
            polling_res = await polling_res.text();
            return { success: false, error: errorToText(solve_req) }
        }

        if (!polling_res.request)
            return { success: false, error: "Captcha solving service sent invalid json!" }

        if (polling_res.status == 0)
            continue;
        break;
    }
    if (polling_res.status == 1)
        return { success: true, solution: polling_res.request }
    else
        return { success: false, error: "Your captcha solving service failed to solve the captcha!" }
}

// Compatibility mode essentially. Tries to use the basic 2captcha API for maximum compatibility.
async function getGenericSolution(key, url, fetch) {
    var balcheck = await checkBalance(url, key, fetch);
    if (balcheck)
        return balcheck;

    try {
        var solve_req = await fetch(`${url}/in.php?key=${key}&method=userrecaptcha&googlekey=6LdIFr0ZAAAAAO3vz0O0OQrtAefzdJcWQM2TMYQH&pageurl=https://store.steampowered.com/join/&header_acao=1&enterprise=1`);
    } catch (error) {
        return { success: false, error: "Failed to connect to captcha solving service" }
    }

    if (!solve_req.ok)
        return { success: false, error: "Error sending captcha solving request" }

    solve_req = await solve_req.text();

    if (solve_req.startsWith("OK|"))
        solve_req = { status: solve_req.split("|")[0], request: solve_req.split("|")[1] }
    else
        return { success: false, error: errorToText(solve_req) };

    for (var i = 0; i < 30; i++) {
        await sleep(5000);

        try {
            var polling_res = await fetch(`${url}/res.php?key=${key}&action=get&id=${solve_req.request}&header_acao=1`);
        } catch (error) {
            return { success: false, error: "Failed to connect to captcha solving service" }
        }

        polling_res = await polling_res.text();

        if (polling_res == "CAPCHA_NOT_READY")
            continue; // wait some more

        if (polling_res.startsWith("OK|"))
            polling_res = polling_res.substring(3); // wtf?

        if (polling_res.startsWith("03")) // an actual token
            return { success: true, solution: polling_res }
        else
            return { success: false, error: errorToText(polling_res) }
    }
    return { success: false, error: "Your captcha solving service failed to solve the captcha!" }
}

exports.CaptchaAPI = function (host, key, _fetch) {
    return {
        getRecapSolution: async function () {
            if (!key || key == "") {
                return { success: false, error: "Captcha key empty!" };
            }
            if (!host || host == "") {
                return { success: false, error: "Host empty!" };
            }
            var hostname = new URL(host).hostname;
            var res;
            switch (hostname) {
                case "2captcha.com":
                case "rucaptcha.com":
                    res = await get2CapSolution(key, "https://2captcha.com", _fetch);
                    break;
                default:
                    res = await getGenericSolution(key, host, _fetch);
                    break;
            }
            if (res.success)
                return { success: res.success, token: res.solution }
            else
                return { success: res.success, error: res.error }
        },
        async isValidKey() {
            return await checkBalance(host, key, _fetch);
        }
    }
}
