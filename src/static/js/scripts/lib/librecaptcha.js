async function get2CapSolution(key, url) {
    try {
        var balance_res = await fetch(`${url}/res.php?key=${key}&action=getbalance&header_acao=1`);
    } catch (error) {
        return { success: false, error: "Failed to connect to captcha provider" }
    }

    if (!balance_res.ok)
        return { success: false, message: "Error getting balance" }

    balance_res = await balance_res.text();

    if (balance_res == "ERROR_KEY_DOES_NOT_EXIST")
        return { success: false, error: "Invalid captcha key" }

    if (balance_res == "0")
        return { success: false, error: "Zero balance at captcha provider" }

    try {
        var solve_req = await fetch(`${url}/in.php?key=${key}&method=userrecaptcha&googlekey=6LerFqAUAAAAABMeByEoQX9u10KRObjwHf66-eya&pageurl=https://store.steampowered.com/join/&header_acao=1&soft_id=2370&json=1`);
    } catch (error) {
        return { success: false, error: "Failed to connect to captcha provider" }
    }

    if (!solve_req.ok)
        return { success: false, error: "Error sending captcha solving request" }

    try {
        solve_req = await solve_req.json()
    } catch (e) {
        solve_req = await solve_req.text();
        switch (solve_req) {
            case "ERROR_CAPTCHA_UNSOLVABLE":
                return { success: false, error: 'Captcha "unsolvable"' }
            default:
                return { success: false, error: "Captcha service sent invalid json!" }
        }
    }

    if (!solve_req.request)
        return { success: false, error: "Captcha service send invalid json!" }

    for (var i = 0; i < 30; i++) {
        await sleep(5000);
        try {
            var polling_res = await fetch(`${url}/res.php?key=${key}&action=get&id=${solve_req.request}&json=1&header_acao=1`);
        } catch (error) {
            return { success: false, error: "Failed to connect to captcha provider" }
        }
        try {
            polling_res = await polling_res.json()
        } catch (e) {
            polling_res = await polling_res.text();
            switch (polling_res) {
                case "ERROR_CAPTCHA_UNSOLVABLE":
                    return { success: false, error: "Captcha Unsolvable" }
                default:
                    return { success: false, error: "Captcha service sent invalid json!" }
            }
        }

        if (!polling_res.request)
            return { success: false, error: "Captcha service sent invalid json!" }

        if (polling_res.status == 0)
            continue;
        break;
    }
    if (polling_res.status == 1)
        return { success: true, solution: polling_res.request }
    else
        return { success: false, error: "Captcha service failed to solve!" }
}

exports.CaptchaAPI = function (host, key) {
    return {
        getRecapSolution: async function () {
            if (!key || key == "") {
                return { success: false, error: { message: "Captcha key empty!" } };
            }
            if (!host || host == "") {
                return { success: false, error: { message: "Host empty!" } };
            }
            var hostname = new URL(host).hostname;
            var res;
            switch (hostname) {
                case "2captcha.com":
                    res = await get2CapSolution(key, "https://2captcha.com");
                    break;
                default:
                    res = await get2CapSolution(key, host);
                    break;
            }
            if (res.success)
                return { success: res.success, solution: res.solution }
            else
                return { success: res.success, error: res.error }
        }
    }
}