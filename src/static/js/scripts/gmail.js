async function getGmail() {
    try {
        var req = await fetch("https://mail.google.com/mail/feed/atom", {
            credentials: "include",
            headers: { "Authorization": "BasicCustom" }
        });
        if (req.status != 200)
            return { error: req.status }
        return await req.text();
    } catch (error) {
        return;
    }
}

async function getEmailByID(id) {
    return await httpRequest({
        url: `https://mail.google.com/mail/u/0?view=att&th=${id}&attid=0&disp=comp&safe=1&zw`,
        xhrFields: {
            withCredentials: true
        },
    }, null, null).catch(function () { });
}

exports.getGmailAddress = async function () {
    var xml = await getGmail();
    if (!xml)
        return null;
    if (xml.error)
        return xml;
    xml = $($.parseXML(xml));
    return xml.find("feed>title")[0].innerHTML.split("for ")[1];
}

async function getGmailIndex() {
    var xml = await getGmail();
    if (!xml || xml.error)
        return null;
    return $($.parseXML(xml)).find("feed>entry");
}

var latestdate = Date.now();

exports.updateTimeStamp = function () {
    latestdate = Date.now();
}

// Returns an array of new emails
async function anyNewEmails() {
    var index = (await getGmailIndex());
    var ret = [];
    if (!index)
        return [];
    for (var i = index.length; i--;) {
        var elem = $(index[i]);
        var date = new Date(elem.children("modified")[0].innerHTML);
        if (!latestdate || date > latestdate) {
            latestdate = date;
            ret.push(elem);
        }
    }
    return ret;
}

function getEmailID(elem) {
    return new URLSearchParams(
        new URL(elem.children("link")
            .attr("href")).search
    ).get("message_id");
}

function isRelevantEmail(elem, steamguard) {
    if (elem.find("author>email")[0].innerHTML != "noreply@steampowered.com")
        return;
    var title = elem.children("title")[0].innerHTML;
    return steamguard ? title == "Disable Steam Guard Confirmation" : title == "New Steam Account Email Verification";
}

async function latestSteamEmail(steamguard) {
    var emails = await anyNewEmails();
    for (var i = emails.length; i--;) {
        var email = emails[i];
        if (!isRelevantEmail(email, steamguard))
            continue;
        return getEmailID(email);
    }
}

exports.waitForSteamEmail = async function (steamguard) {
    // Wait max 20 seconds
    for (var i = 0; i <= 2; i++) {
        await sleep(5000);
        var email = await latestSteamEmail(steamguard);
        if (email)
            return getEmailByID(email)
    }
}

/*async function fetchloop() {
    var emails = await anyNewEmails();
    //console.log(emails)
    for (var i = emails.length; i--;) {
        var email = emails[i];
        //console.log(email)
        if (!isRelevantEmail(email))
            continue;
        console.log(getEmailID(email));
    }
    setTimeout(fetchloop, 5000);
}*/

global.latestSteamEmail = latestSteamEmail;
global.getEmailByID = getEmailByID;

//fetchloop();
