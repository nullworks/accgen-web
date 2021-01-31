const to = require("await-to-js").default;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getBaseResponse() {
    return {
        // Was the request successful?
        success: null,
        // Always not null if success == true
        response: null,
        // Always not null if success == false
        error: {
            type: null,
            steamcode: null,
            httpcode: null,
            message: null
        },
        steamError: function (code) {
            this.success = false;
            this.error.type = "steam";
            this.error.steamcode = code;
        },
        httpError: function (code) {
            this.success = false;
            this.error.type = "http";
            this.error.httpcode = code;
        },
        networkError: function () {
            this.success = false;
            this.error.type = "network";
        }
    }
}

// Allow failed requests to be repeated 3 times -> proxy support
function repeated_fetch(fetch, url, options) {
    return new Promise(async function (resolve, reject) {
        var res, err;
        for (var i = 0; i < 3; i++) {
            [err, res] = await to(fetch(url, options));
            if (!err)
                return resolve(res);
            // Request failed -> Network error
            console.log(err);
            // Don't wait if last loop fails
            if (i >= 2)
                return reject(err);
            await sleep(1000);
        }
    });
}

exports.repeated_fetch = repeated_fetch;
exports.getBaseResponse = getBaseResponse;

exports.steam_getGid = async function (fetch) {
    var [err, res] = await to(repeated_fetch(fetch, "https://store.steampowered.com/join/refreshcaptcha/", {
        mode: "cors",
        credentials: "include",
        headers: {
            'Accept-Language': 'en-US',
        },
    }));

    var response = getBaseResponse();
    if (err)
        response.networkError();
    else if (!res.ok)
        response.httpError(res.status);
    else {
        response.success = true;
        response.response = await res.json();
    }
    return response;
}

exports.steam_requestVerify = async function (fetch, email, gid, recaptcha_solution) {
    var [err, res] = await to(repeated_fetch(fetch, "https://store.steampowered.com/join/ajaxverifyemail", {
        method: 'POST',
        mode: "cors",
        credentials: "include",
        body: new URLSearchParams({
            email: email,
            captchagid: gid,
            captcha_text: recaptcha_solution,
            elang: 0
        }).toString(),
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept-Language': 'en-US',
        },
    }));

    var response = getBaseResponse();
    if (err)
        response.networkError();
    else if (!res.ok)
        response.httpError(res.status);
    else {
        var json = await res.json();
        response.response = json;
        if (json.success == 1) {
            response.success = true;
            response.response = json;
        }
        else {
            response.steamError(json.success);
        }
    }
    return response;
}

exports.steam_verifyEmail = async function (fetch, link) {
    var [err, res] = await to(repeated_fetch(fetch, link, {
        mode: "cors",
        credentials: "include",
        headers: {
            'Accept-Language': 'en-US',
        },
    }));
    var response = getBaseResponse();
    if (err)
        response.networkError();
    else if (!res.ok)
        response.httpError(res.status);
    else
        response.success = true;

    return response;
}

exports.steam_disableGuard = async function (fetch, token) {
    var [err, res] = await to(repeated_fetch(fetch, "https://store.steampowered.com/account/steamguarddisableverification?stoken=" + token, {
        mode: "cors",
        credentials: "include",
        headers: {
            'Accept-Language': 'en-US',
        },
    }));
    var response = getBaseResponse();
    if (err)
        response.networkError();
    else if (!res.ok)
        response.httpError(res.status);
    else {
        response.success = true;
    }
    return response;
}

exports.steam_createAccount = async function (fetch, username, password, creationid) {
    var [err, res] = await to(repeated_fetch(fetch, "https://store.steampowered.com/join/createaccount", {
        method: 'POST',
        mode: "cors",
        credentials: "include",
        body: new URLSearchParams({
            accountname: username,
            password: password,
            count: 4,
            creation_sessionid: creationid
        }).toString(),
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept-Language': 'en-US',
        },
    }));

    var response = getBaseResponse();
    if (err)
        response.networkError();
    else if (!res.ok)
        response.httpError(res.status);
    else {
        var json = await res.json();
        response.response = json;
        if (json.bSuccess) {
            response.success = true;
            response.response = json;
        }
        else {
            response.steamError(-1);
        }

    }
    return response;
}