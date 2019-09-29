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

// Convert from legacy settings system to modern settings system
exports.convert = function () {
    // Init in case cached_settings isn't valid currently
    initSettings();
    // Check if we already converted our config
    if (!exports.get("version")) {
        exports.set("version", 1);
        exports.set("custom_domain", localStorage.getItem("settings_custom_domain"));
        exports.set("captcha_key", localStorage.getItem("settings_twocap"));
        exports.set("captcha_key_type", "2captcha");
    }
    if (exports.get("version") < 2) {
        exports.set("version", 2);
        exports.set("acc_apps_setting", "730");
        exports.set("acc_steam_guard", true);
    }
}