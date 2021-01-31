var cached_settings = null;

function initSettings() {
    if (!cached_settings) {
        var storage = localStorage.getItem("settings");
        if (storage) {
            try {
                cached_settings = JSON.parse(storage);
                if (!cached_settings)
                    cached_settings = {};
            } catch (error) {
                cached_settings = {};
            }
        }
        else
            // If settings dont exist or cached_settings is invalid, use empty cached_settings object
            cached_settings = {};
    }
}

exports.unset = function (setting) {
    // Init in case cached_settings isn't valid currently
    initSettings();
    try {
        delete cached_settings[setting];
        localStorage.setItem("settings", JSON.stringify(cached_settings));
    } catch (error) {
    }
}

exports.get = function (setting) {
    // Init in case cached_settings isn't valid currently
    initSettings();
    // No need to parse settings again, all settings values are already known. Get from cache.
    return cached_settings[setting];
}

exports.set = function (setting, value) {
    // Init in case cached_settings isn't valid currently
    initSettings();
    // Set value
    cached_settings[setting] = value;
    // Also save instantly
    localStorage.setItem("settings", JSON.stringify(cached_settings));
}

function baseSettings() {
    exports.set("version", 6);
    exports.set("custom_domain", localStorage.getItem("settings_custom_domain"));
    exports.set("captcha_key", localStorage.getItem("settings_twocap"));
    exports.set("captcha_host", "https://2captcha.com");
    exports.set("captcha_key_type", "2captcha");
    exports.set("acc_apps", "303386");
    exports.set("acc_steamguard", true);
    exports.set("captcha_mode", "native");
    //exports.set("email_provider", "accgen");
    console.log("Base settings configured!");
}

// Convert from legacy settings system to modern settings system
exports.convert = function () {
    // Init in case cached_settings isn't valid currently
    initSettings();
    // Check if we already converted our config
    if (!exports.get("version"))
        baseSettings();
    else {
        if (exports.get("version") == 1) {
            exports.set("version", 2);
            exports.set("acc_apps_setting", "329385");
            exports.set("acc_steam_guard", true);
            console.log("Migrated from version 1 to version 2!");
        }
        if (exports.get("version") == 2) {
            exports.set("version", 3);
            var subid = exports.get("acc_apps_setting");
            if (subid == "32985" || subid == "303386")
                exports.set("acc_apps_setting", "329385");
            console.log("Migrated from version 2 to version 3!");
        }
        if (exports.get("version") == 3) {
            exports.set("version", 4);
            exports.set("captcha_host", "https://2captcha.com");
            console.log("Migrated from version 3 to version 4!");
        }
        if (exports.get("version") == 4) {
            exports.set("version", 5);
            var subid = exports.get("acc_apps_setting");
            if (subid == "329385")
                exports.set("acc_apps_setting", "303386");
            console.log("Migrated from version 4 to version 5!");
        }
        if (exports.get("version") == 5) {
            exports.set("version", 6);
            exports.set("acc_apps", exports.get("acc_apps_setting"));
            exports.set("acc_steamguard", exports.get("acc_steam_guard"));
            exports.unset("acc_steam_guard");
            exports.unset("acc_apps_setting");
            console.log("Migrated from version 5 to version 6!");
        }
        if (exports.get("version") == 6) {
            exports.set("version", 7);
            exports.set("captcha_mode", "native");
            console.log("Migrated from version 6 to version 7!");
        }
    }
}
