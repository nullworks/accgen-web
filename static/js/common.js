"let strict";

function registerevents() {
    var eventMethod = window.addEventListener ? "addEventListener" : "attachEvent";
    var eventer = window[eventMethod];
    var messageEvent = eventMethod == "attachEvent" ? "onmessage" : "message";

    eventer(messageEvent, async function (e) {
        if (e.origin != "https://store.steampowered.com")
            return
        if (e.data == "recaptcha-setup")
            return;
        if (typeof e.data !== 'string' || e.data.length < 200)
            return;
        // addon is out of date?
        if (e.data.split(";").length != 2) {
            alert("Invalid data received from addon");
            return;
        }

        change_visibility(true);

        var gid = e.data.split(";")[1];
        var recap_token = e.data.split(";")[0];

        // get a fresh gid instead
        gid = await new Promise(function (resolve, reject) {
            $.ajax({
                url: "https://store.steampowered.com/join/refreshcaptcha/"
            }).fail(function () {
                resolve()
            }).done(function (resp) {
                resolve(JSON.parse(resp).gid);
            });
        });

        // no gid? error out
        if (!gid) {
            display_data({
                error: "Invalid data recieved from steam!"
            });
            return;
        }

        var err = undefined;
        var custom_email = undefined;

        if ($("#settings_custom_domain").val() != "") {
            if ($("#settings_custom_domain").val().includes("@"))
                custom_email = $("#settings_custom_domain").val();
            else
                custom_email = makeid(10) + "@" + $("#settings_custom_domain").val();
        }
        var data = await new Promise(function (resolve, reject) {
            $.ajax({
                url: '/userapi/recaptcha/addtask',
                method: 'post',
                dataType: 'json',
                contentType: 'application/json',
                data: JSON.stringify({
                    step: "getdata"
                }),
                success: function (returnData) {
                    resolve(returnData);
                },
                error: function (xhr, status, error) {
                    console.error(xhr);
                    reject(xhr.responseJSON);
                }
            });
        }).catch(function (error) {
            err = error ? error : true;
            console.log(err);
        });
        if (err) {
            if (err.error) {
                display_data(err);
                return;
            }
            display_data({
                error: 'Error returned by SAG backend! Check console for details!'
            });
            return;
        }

        var ajaxveryemail = await new Promise(function (resolve, reject) {
            $.ajax({
                url: "https://store.steampowered.com/join/ajaxverifyemail",
                method: 'POST',
                data: stringifyQueryString({
                    email: custom_email ? custom_email : data.email,
                    captchagid: gid,
                    captcha_text: recap_token
                }),
                success: function (returnData) {
                    resolve(returnData);
                },
                error: function (xhr, status, error) {
                    console.error(xhr);
                    reject(xhr.responseJSON);
                }
            });
        }).catch(function (error) {
            err = error ? error : true;
            console.log(err);
        });
        if (err) {
            display_data({
                error: 'Error while creating the Steam account! Check console for details!'
            });
            return;
        }
        if (ajaxveryemail && ajaxveryemail.success) {
            switch (ajaxveryemail.success) {
                case 13:
                    display_data({
                        error: 'The email chosen by our system was invalid. Please Try again.'
                    });
                    break;

                case 14:
                    display_data({
                        error: 'The account name our system chose was not available. Please Try again.'
                    });
                    break;
                case 84:
                    display_data({
                        error: 'Steam is limitting account creations from your IP. Try again later.'
                    });
                    break;
                case 101:
                    display_data({
                        error: 'Captcha failed or IP banned by steam (vpn?)'
                    });
                    break;
                case 17:
                    display_data({
                        error: 'Steam has banned the domain. Please use Gmail or Custom domain'
                    });
                    $("#custom_domain_div").show('slow');
                    report_email();
                    break;
                case 1:
                    break;
                default:
                    display_data({
                        error: 'Error while creating the Steam account! Check console for details!'
                    });
                    break;
            }
        }

        var verifydata = await new Promise(function (resolve, reject) {
            $.ajax({
                url: '/userapi/recaptcha/addtask',
                method: 'post',
                dataType: 'json',
                contentType: 'application/json',
                data: JSON.stringify({
                    step: "getverify",
                    email: ($("#settings_custom_domain").val() != "") ? custom_email : data.email
                }),
                success: function (returnData) {
                    resolve(returnData);
                },
                error: function (xhr, status, error) {
                    console.error(xhr);
                    reject(xhr.responseJSON);
                }
            });
        }).catch(function (error) {
            err = error ? error : true;
            console.log(err);
        });
        if (err) {
            if (err.error) {
                display_data(err);
                return;
            }
            display_data({
                error: 'Error returned by SAG backend! Check console for details!'
            });
            return;
        }

        await new Promise(function (resolve, reject) {
            $.ajax({
                url: verifydata.verifylink,
                success: function (returnData) {
                    resolve(returnData);
                },
                error: function (xhr, status, error) {
                    console.error(xhr);
                    reject(xhr.responseJSON);
                }
            });
        }).catch(function (error) {
            err = error ? error : true;
            console.log(err);
        });
        if (err) {
            display_data({
                error: 'Error while creating the Steam account! Check console for details!'
            });
            return;
        }

        var createaccount = await new Promise(function (resolve, reject) {
            $.ajax({
                url: "https://store.steampowered.com/join/createaccount",
                method: 'POST',
                data: 'accountname=' + data.username + '&password=' + data.password + '&count=4&lt=0&creation_sessionid=' + verifydata.creationid,
                success: function (returnData) {
                    resolve(returnData);
                },
                error: function (xhr, status, error) {
                    console.error(xhr);
                    reject(xhr.responseJSON);
                }
            });
        }).catch(function (error) {
            err = error ? error : true;
            console.log(err);
        });
        if (err) {
            display_data({
                error: 'Error while creating the Steam account! Check console for details!'
            });
            return;
        }
        if (!createaccount.bSuccess) {
            display_data({
                error: 'Error while creating the Steam account! Check console for details!'
            });
            return;
        }

        var account = await new Promise(function (resolve, reject) {
            $.ajax({
                url: '/userapi/recaptcha/addtask',
                method: 'post',
                dataType: 'json',
                contentType: 'application/json',
                data: JSON.stringify({
                    step: "steamguard",
                    username: data.username,
                    password: data.password,
                    email: ($("#settings_custom_domain").val() != "") ? custom_email : data.email
                }),
                success: function (returnData) {
                    resolve(returnData);
                },
                error: function (xhr, status, error) {
                    console.error(xhr);
                    reject(xhr.responseJSON);
                }
            });
        }).catch(function (error) {
            err = error ? error : true;
            console.log(err);
        });
        if (err) {
            if (err.error) {
                display_data(err);
                return;
            }
            display_data({
                error: 'Error returned by SAG backend! Check console for details!'
            });
            return;
        }
        on_generated(account);
    }, false);
}

function report_email(email) {
    grecaptcha.execute('6LfG55kUAAAAANVoyH7VqYns6j_ZpxB35phXF0bM', {
        action: 'vote_email'
    }).then(function (token) {
        $.ajax({
            url: '/userapi/recaptcha/bademail/' + token
        }).done(function (emailresp) {
            console.log("Log: email reported ban");
        })
    })
}

function stringifyQueryString(params) {
    return queryString = Object.keys(params).map(key => key + '=' + params[key]).join('&');
}

function makeid(length) {
    var result = '';
    var characters = 'abcdefghijklmnopqrstuvwxyz';
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
}

function on_status_received(resp) {
    if (resp.status) {
        document.getElementById("accgen_status_msg").textContent = resp.status;
        $("#accgen_status").show("slow");
    } else {
        $("#accgen_status").hide("slow");
    }
}

function perform_status_check() {
    $.ajax({
        url: "/api/v1/status"
    }).done(function (resp) {
        on_status_received(resp)
    })
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
            document.getElementById('ffaddon').href = 'https://addons.opera.com/en/extensions/details/sag/';
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

function common_generate_pressed() {
    if ($("#steam_iframe").is(":hidden"))
        change_visibility(2);
    $("#steam_iframe").toggle("slow")
    document.getElementById('steam_iframe_innerdiv').src = "https://store.steampowered.com/join/";
}

function common_change_visibility(pre_generate) {
    if (pre_generate) {
        $('#mx_error').hide("slow");
        $('#generate_error').hide("slow");
        $('#generated_data').hide("slow");
        $('#custom_domain_div').hide("slow");
        $('#history_list').hide("slow");
        $('#steam_iframe').hide("slow");

        if (pre_generate == 1) {
            $('#control_buttons').hide();
            $('#generate_progress').show("slow");
        }
    } else {
        $('#control_buttons').show();
        $('#generate_progress').hide("slow");
    }
}

function display_data(acc_data) {
    change_visibility(false);

    if (acc_data.error) {
        $("#generate_error").show("slow")
        $("#generate_error_text").html(acc_data.error)
        return;
    }
    if (localStorage.getItem("genned_account") == null) {
        localStorage.setItem("genned_account", JSON.stringify([]))

    }
    localStorage.setItem("genned_account", JSON.stringify(JSON.parse(localStorage.getItem("genned_account")).concat(acc_data)));

    $("#acc_login").html(`Login: <a id="acc_link"><strong>${acc_data.login}</strong></a>`)
    $("#acc_link").attr("href", `https://steamcommunity.com/profiles/${acc_data.steamid}`);
    $("#acc_pass").html(`Password: <strong>${acc_data.password}</strong>`)
    $("#generated_data").show("slow");
}

async function isvalidmx(domain) {
    var patt = new RegExp("^([a-z0-9]+([\-a-z0-9]*[a-z0-9]+)?\.){0,}([a-z0-9]+([\-a-z0-9]*[a-z0-9]+)?){1,63}(\.[a-z0-9]{2,7})+$");
    if (!patt.test(domain))
        return false;
    var res = await new Promise(function (resolve, reject) {
        $.ajax({
            url: "/userapi/isvalidmx/" + domain,
            success: function (returnData) {
                resolve(returnData);
            },
            error: function () {
                reject();
            }
        });
    }).catch(function () {
        console.error('DNS lookup failed!');
    })
    if (!res || !res.valid)
        return false;
    return true;
}

function common_init() {
    if (localStorage.getItem("genned_account") != null) {
        $('#history_button').show();
    }
    setInterval(perform_status_check, 10000);
    perform_status_check();
    registerevents();

    // Check if addon installed
     $.ajax({
         url: "https://store.steampowered.com/join/"
     }).done(function () {}).fail(function (resp) {
         $("#addon_dl").show();
         $("#accgen_ui").hide();
         $("#generate_button").hide();
     });
    load_settings()
    changeText();
}

function history_pressed() {
    if ($("#history_list").is(":hidden")) {
        change_visibility(2);
        $("#genned_accs").empty();
        if (localStorage.getItem("genned_account") != null) {
            $.each((JSON.parse(localStorage.getItem("genned_account"))).reverse(), function (i, item) {
                $('<tr class="table-primary">').html(
                    "<td>" + item.login + "</td><td>" + item.password + "</td>").appendTo('#genned_accs');
            })

        }
    }
    $("#history_list").toggle('slow');
}

function custom_domain_pressed() {
    if ($("#custom_domain_div").is(":hidden"))
        change_visibility(2);
    $("#custom_domain_div").toggle('slow');
}

function save_settings() {
    $('input[type="text"]').each(function () {
        var id = $(this).attr('id');
        var value = $(this).val();
        localStorage.setItem(id, value);
    });
    $("#custom_domain_div").toggle('slow');
}

function settings_help(page) {
    switch (page) {
        case "gmail":
            window.open("https://github.com/nullworks/accgen-web/wiki/Using-Your-Gmail-address-with-Steam-Account-Generator");
            break;
        case "mx":
            window.open("https://i.imgur.com/Vc25ROf.png");
            break;
        default:
            console.log("Invalid settings page");
            break;

    }
}

function load_settings() {
    $('input[type="text"]').each(function () {
        var id = $(this).attr('id');
        var value = localStorage.getItem(id);
        $(this).val(value);
    });
}

async function save_clicked() {
    gtag('event', 'settings_saved');
    if ($("#settings_custom_domain").val() == "") {
        save_settings();
        $("#mx_error").hide("slow");
        return;
    }
    if (!$("#settings_custom_domain").val().includes("@"))
        if (await isvalidmx($("#settings_custom_domain").val())) {
            save_settings();
            $("#mx_error").hide("slow");
        } else {
            $("#mx_error").show("slow");
            $("#settings_custom_domain").val("")
        }
    else
        save_settings();
}