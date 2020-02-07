var loadJS = function (url, implementationCode, location) {
    //url is URL of external file, implementationCode is the code
    //to be called from the file, location is the location to 
    //insert the <script> element

    var scriptTag = document.createElement('script');
    scriptTag.src = url;

    scriptTag.onload = implementationCode;
    scriptTag.onreadystatechange = implementationCode;

    location.appendChild(scriptTag);
};

var recaploaded = false;
exports.loadRecaptchaV3 = function () {
    return new Promise(function (resolve) {
        if (recaploaded)
            resolve();
        recaploaded = true;
        loadJS("https://recaptcha.net/recaptcha/api.js?render=6LfG55kUAAAAANVoyH7VqYns6j_ZpxB35phXF0bM", function () {
            grecaptcha.ready(resolve);
        }, document.body);
    });
}