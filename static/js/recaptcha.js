"let strict";

function stringifyQueryString(params) {
    return queryString = Object.keys(params).map(key => key + '=' + params[key]).join('&');
}

function registerevents() {
    var eventMethod = window.addEventListener ? "addEventListener" : "attachEvent";
    var eventer = window[eventMethod];
    var messageEvent = eventMethod == "attachEvent" ? "onmessage" : "message";

    eventer(messageEvent, function (e) {
        if (e.origin != "https://store.steampowered.com")
            return
        if (e.data == "recaptcha-setup")
            return;
        if (typeof e.data !== 'string' || e.data.length < 200)
            return;
        if (e.data.split(";").length != 2) {
            alert("Invalid data received from steam");
            return;
        }
        var gid = e.data.split(";")[1];
        var recap_token = e.data.split(";")[0];
        $("#generate_button").hide();
        $("#generate_progress").show("slow");
        $("#recap_steam").hide();

        $.ajax({
            url: 'https://accgen.cathook.club/userapi/recaptcha/getemail'
        }).done(function (emailresp) {
            $.ajax({
                url: "https://store.steampowered.com/join/ajaxverifyemail",
                method: 'POST',
                data: stringifyQueryString({
                    email: emailresp.email,
                    captchagid: gid,
                    captcha_text: recap_token
                })
            }).done(function (resp) {
                switch (resp.success) {
                    case 17:
                        gtag('event', 'email_banned');
                        on_generated({
                            error: 'Email Domain banned.. Please wait for us to update it'
                        })
                        break;
                    case 101:
                        gtag('event', 'newgen_fail_2');
                        on_generated({
                            error: 'Recaptcha solution incorrect!'
                        });
                        break;
                    case 1:
                        $.ajax({
                            url: "https://accgen.cathook.club/userapi/recaptcha/addtask/" + emailresp.email
                        }).done(function (resp) {
                            gtag('event', 'newgen_success');
                            on_generated(resp)
                            console.log(resp);
                        }).fail(function (resp) {
                            gtag('event', 'newgen_fail_3');
                            on_generated(resp.responseJSON)
                        })
                        break;
                    default:
                        console.log(resp.success);
                        on_generated({
                            error: 'Unknown error during registration.'
                        });
                }
            }).fail(function (resp) {
                on_generated({
                    error: 'Unknown error during registration!'
                })
            })

        })


    }, false);
}

function on_count_received(resp) {
    $("#account_count").prop("count", (localStorage.getItem("account_count") || 0)).animate({
        count: parseInt(resp)
    }, {
        duration: 4000,
        easing: 'swing',
        step: function (now) {
            $("#account_count").text(Math.ceil(now))
        }
    })

    localStorage.setItem("account_count", resp)
}

function history_pressed() {
    $('#genned_accs').empty()
    $("#generate_error").hide()
    $("#generate_progress").hide()
    $("#generated_data").hide()
    $("#acc_email").hide()

    $("#generated_accs_table_card").show();
    if (localStorage.getItem("genned_account") != null) {

        $.each((JSON.parse(localStorage.getItem("genned_account"))).reverse(), function (i, item) {
            $('<tr class="table-primary">').html(
                "<td>" + item.login + "</td><td>" + item.password + "</td>").appendTo('#genned_accs');
        })

    }

}

function perform_count_check() {
    $.ajax({
        url: "https://accgen.cathook.club/api/v1/count"
    }).done(function (resp) {
        on_count_received(resp)
    })
}

function on_generated(acc_data) {
    document.getElementById('innerdiv').src = "https://store.steampowered.com/join/";
    $("#generate_progress").hide()
    $("#recap_steam").hide()


    if (acc_data.error) {
        $("#generate_error").show("slow")
        $("#generate_error_text").text(acc_data.error)
        $("#generate_button").show("slow")
        if (localStorage.getItem("genned_account") != null) {
            $('#history_button').show();
        }
        return;
    }
    if (localStorage.getItem("genned_account") == null) {
        localStorage.setItem("genned_account", JSON.stringify([]))

    }
    localStorage.setItem("genned_account", JSON.stringify(JSON.parse(localStorage.getItem("genned_account")).concat(acc_data)));

    $("#acc_login").html(`Login: <strong>${acc_data.login}</strong>`)
    $("#acc_pass").html(`Password: <strong>${acc_data.password}</strong>`)
    $("#generated_data").show("slow")
    $("#generate_button").show("slow")
    if (localStorage.getItem("genned_account") != null) {
        $('#history_button').show();
    }
}

function sleep(ms) {
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
    gtag('event', 'newgen_unsupported_browser');
    return "Unsupported";
}

function AddonsNotSupported() {
    window.location = "legacy.html";
}

function changeText() {
    switch (GetBrowser()) {
        case "Firefox":
            if (isIOS())
                return AddonsNotSupported("Firefox IOS")
            document.getElementById("addon_download_text").textContent = "You don't have our Firefox addon yet!";
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
            document.getElementById('ffaddon').href = 'https://chrome.google.com/webstore/detail/sag/piljlfgibadchadlhlcfoecfbpdeiemd';
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

async function installAddon() {
    switch (GetBrowser()) {
        case "Firefox":
            InstallTrigger.install({
                'Steam Account Helper': 'https://addons.mozilla.org/firefox/downloads/latest/sag/'
            });
            // Don't redirect to addon page if doubleclicking
            await sleep(500);
            document.getElementById('ffaddon').href = 'https://addons.mozilla.org/en-US/firefox/addon/sag/'; //if above failed
            document.getElementById('ffaddon').target = "_blank";
            document.getElementById('ffaddon').onclick = "";
            break;
        default:
            break;
    }
}

function generate_pressed() {
    $("#generated_accs_table_card").hide();
    $("#generate_button").hide();
    $("#recap_steam").show();
    $("#generated_data").hide();
    $("#generate_error").hide();
}


function init() {
    $("#generated_accs_table_card").hide()
    $("#generate_error").hide()
    $("#generate_progress").hide()
    $("#generated_data").hide()
    $("#recap_steam").hide()
    $("#acc_email").hide()
    if (localStorage.getItem("genned_account") != null) {
        $('#history_button').show();
    }
    setInterval(perform_count_check, 10000);
    perform_count_check();
    registerevents();

    // Check if addon installed
    $.ajax({
        url: "https://store.steampowered.com/join/"
    }).done(function () {
        $("#generate_button").show();
    }).fail(function (resp) {
        $("#addon_dl").show();
        $("#accgen_ui").hide();
        $("#generate_button").hide();
    });


    changeText();
}