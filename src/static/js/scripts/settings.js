var cached_settings = null;

function initSettings() {
    if (!cached_settings) {
        var storage = localStorage.getItem("settings");
        if (storage) {
            try {
                cached_settings = JSON.parse(storage);
                return;
            } catch (error) {
                console.error(error);
            }
        }
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
    // Check if we already converted our config
    if (exports.get("version"))
        return;
    exports.set("version", 1);
    exports.set("custom_domain", localStorage.getItem("settings_custom_domain"));
    exports.set("captcha_key", localStorage.getItem("settings_twocap"));
    exports.set("captcha_key_type", "2captcha");
}