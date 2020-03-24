const PROXYTYPES = {
    EMULATED: 0,
    DIRECT: 1,
    BACKCONNECT: 2,
}

const VALIDSTATE = {
    INVALID: 0,
    VALID: 1,
    TEMP_INVALID: 2,
}

function msToTime(duration) {
    var seconds = Math.floor((duration / 1000) % 60),
        minutes = Math.floor((duration / (1000 * 60)) % 60),
        hours = Math.floor((duration / (1000 * 60 * 60)) % 24);

    hours = (hours < 10) ? "0" + hours : hours;
    minutes = (minutes < 10) ? "0" + minutes : minutes;
    seconds = (seconds < 10) ? "0" + seconds : seconds;

    return hours + ":" + minutes + ":" + seconds;
}

// https://stackoverflow.com/a/2450976
function shuffle(array) {
    var currentIndex = array.length, temporaryValue, randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {

        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
}

function initEmulatedProxy(proxy) {
    proxy.ratelimit = function () {
        this.internal.valid = false;
    }
    proxy.ban = function () {
        this.internal.valid = false;
    }
    proxy.isValid = function () {
        return this.internal.valid;
    }
    proxy.error = function () { }
}

function initDirectProxy(proxy, parent) {
    proxy.ratelimit = function () {
        this.internal.timeout = Date.now() + 12 * 60 * 60 * 1000;
        if (parent) parent.dump();
    }
    proxy.ban = function () {
        this.internal.banned = true;
        this.internal.verified = false;
        if (parent) parent.dump();
    }
    proxy.isValid = function () {
        return !this.internal.banned && Date.now() > this.internal.timeout;
    }
    proxy.verify = function () {
        this.internal.verified = true;
        if (parent) parent.dump();
    }
    proxy.status = function () {
        var ret = "";
        if (this.internal.verified)
            ret += "Verified";
        else if (this.internal.banned)
            ret += "Banned";
        else
            ret += "Unchecked";
        if (this.internal.timeout > Date.now())
            ret += `, timeout ${msToTime(this.internal.timeout - Date.now())}`
        return ret;
    }
}

function initBackconnectProxy(proxy, parent) {
    proxy.ratelimit = function () {
        this.internal.timeout = Date.now() + this.internal.rotatetime;
        if (parent) parent.dump();
    }
    proxy.ban = function () {
        this.internal.timeout = Date.now() + this.internal.rotatetime;
        if (parent) parent.dump();
    }
    proxy.isValid = function () {
        return this.internal.timeout < Date.now() ? VALIDSTATE.VALID : VALIDSTATE.TEMP_INVALID;
    }
    proxy.verify = function () { }
    proxy.status = function () {
        if (this.internal.timeout > Date.now())
            return `Timeout ${msToTime(this.internal.timeout - Date.now())}`
        else
            return "Ready"
    }
}

function applyProxyFunctions(proxy, parent) {
    switch (proxy.type) {
        case PROXYTYPES.EMULATED:
            initEmulatedProxy(proxy);
            break;
        case PROXYTYPES.DIRECT:
            initDirectProxy(proxy, parent);
            break;
        case PROXYTYPES.BACKCONNECT:
            initBackconnectProxy(proxy, parent);
            break;
        default:
            throw new Error("Invalid proxy type!");
    }
    return proxy;
}

function getBaseProxy(type, uri) {
    return {
        uri: uri,
        type: type,
        errors: 0
    };
}

function getNewEmulatedProxy() {
    var proxy = getBaseProxy(PROXYTYPES.EMULATED);
    proxy.internal = {
        valid: true
    }
    return applyProxyFunctions(proxy);
}

function getNewDirectProxy(uri, parent) {
    var proxy = getBaseProxy(PROXYTYPES.DIRECT, uri);
    proxy.internal = {
        verified: false,
        errorcount: 0,
        banned: false,
        timeout: 0
    }
    return applyProxyFunctions(proxy, parent);
}

function getNewBackconnectProxy(uri, parent, rotatetime) {
    var parsed = parseInt(rotatetime);
    var proxy = getBaseProxy(PROXYTYPES.BACKCONNECT, uri);
    proxy.internal = {
        rotatetime: isNaN(parsed) ? 300 : parsed,
        timeout: 0
    }
    return applyProxyFunctions(proxy, parent);
}

function proxylistLinter(list) {
    // Verify if the proxy list is valid
    var data;
    try {
        data = JSON.parse(list)
    } catch (e) {
        return false;
    }

    // Check if the json is correct
    if (typeof data == "object" && Array.isArray(data.proxies)) {
        for (var i in data.proxies) {
            var entry = data.proxies[i];
            if (!entry.uri) {
                return false;
            }
            try {
                new URL(entry.uri);
            } catch (error) {
                return false;
            }
        }
    } else
        return false;
    return true;
}

/*
input: JSON formatted text of a proxy list
save: a function that handles storing the JSON formatted text, one param (json formatted text)
check: a function that checks a proxy, one param (proxy)
*/
exports.newList = function (input, save, check) {
    var list = {
        proxies: [],
        // Save function
        dump: function () {
            if (save)
                save(JSON.stringify({ proxies: this.proxies }));
        },
        // Load JSON text
        restore: function (json) {
            if (!json)
                return true;
            if (!proxylistLinter(json))
                return false;
            this.proxies = JSON.parse(json).proxies;
            for (var i in this.proxies)
                applyProxyFunctions(this.proxies[i], this);
            this.dump();
            return true;
        },
        // Import direct proxies from a newline delimited string
        importDirectNewline: function (text) {
            var newproxies = text.split("\n");
            for (var i in newproxies) {
                var proxy = newproxies[i];
                try {
                    new URL(proxy);
                    if (this.proxies.find(o => o.uri == proxy))
                        continue;
                    this.proxies.push(getNewDirectProxy(proxy, this));
                } catch (error) { }
            }
            this.dump();
        },
        importDirect: function (proxy) {
            try {
                new URL(proxy);
                if (this.proxies.find(o => o.uri == proxy))
                    return false;
                this.proxies.push(getNewDirectProxy(proxy, this));
                this.dump();
                return true;
            } catch (error) { return false; }
        },
        importBackconnect: function (proxy, rotatetime) {
            try {
                new URL(proxy);
                if (this.proxies.find(o => o.uri == proxy))
                    return false;
                this.proxies.push(getNewBackconnectProxy(proxy, this, rotatetime));
                this.dump();
                return true;
            } catch (error) { return false; }
        },
        getEmulated: function () {
            return getNewEmulatedProxy();
        },
        getProxy: async function () {
            var proxies = this.proxies;
            // Filter out invalid proxies
            proxies = proxies.filter(function (value) {
                return value.isValid() == VALIDSTATE.VALID;
            })
            shuffle(proxies);
            if (!check)
                return proxies[0];
            for (var i in proxies) {
                if (await check(proxies[i].uri)) {
                    proxies[i].errors = 0;
                    return proxies[i];
                }
                proxies[i].errors++;
            }
            return null;
        }
    }
    if (!list.restore(input))
        throw new Error("Invalid input list");
    return list;
}