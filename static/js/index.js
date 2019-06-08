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
        var gid = e.data.split(";")[1];
        var recap_token = e.data.split(";")[0];

        // get a fresh gid instead
        gid = await new Promise(function (resolve, reject) {
            $.ajax({
                url: "https://store.steampowered.com/join/"
            }).fail(function () {
                resolve()
            }).done(function (resp) {
                resolve(resp.split('id="captchagid" value="')[1].split("\"")[0]);
            });
        });

        // no gid? error out
        if (!gid) {
            on_generated({
                error: "Invalid data recieved from steam!"
            });
            return;
        }

        $("#generate_button").hide();
        $("#generate_progress").show("slow");
        $("#recap_steam").hide();
        $("#custom_domain_div_parent").hide('slow');
        $("#mx_error").hide("slow");
        $("#custom_domain_button").hide();
        $('#history_button').hide();

        var err = undefined;
        var custom_email = undefined;

        if ($("#settings_custom_domain").val() != "")
            custom_email = makeid(10) + "@" + $("#settings_custom_domain").val();
        var data = await new Promise(function (resolve, reject) {
            $.ajax({
                url: 'https://accgen.cathook.club/userapi/recaptcha/addtask',
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
                on_generated(err);
                return;
            }
            on_generated({
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
            on_generated({
                error: 'Error while creating the Steam account! Check console for details!'
            });
            return;
        }
        if (ajaxveryemail && ajaxveryemail.success) {
            switch (ajaxveryemail.success) {
                case 13:
                    on_generated({
                        error: 'The email chosen by our system was invalid. Please Try again.'
                    });
                    break;

                case 14:
                    on_generated({
                        error: 'The account name our system chose was not available. Please Try again.'
                    });
                    break;
                case 84:
                    on_generated({
                        error: 'Steam is limitting account creations from your IP. Try again later.'
                    });
                    break;
                case 101:
                    on_generated({
                        error: 'Captcha failed or IP banned by steam (vpn?)'
                    });
                    break;
                case 17:
                    on_generated({
                        error: 'Email banned (Please contact us! https://t.me/sag_bot_chat)'
                    });
                    report_email();
                    break;
                case 1:
                    break;
                default:
                    on_generated({
                        error: 'Error while creating the Steam account! Check console for details!'
                    });
                    break;
            }
        }

        var verifydata = await new Promise(function (resolve, reject) {
            $.ajax({
                url: 'https://accgen.cathook.club/userapi/recaptcha/addtask',
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
                on_generated(err);
                return;
            }
            on_generated({
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
            on_generated({
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
            on_generated({
                error: 'Error while creating the Steam account! Check console for details!'
            });
            return;
        }
        if (!createaccount.bSuccess) {
            on_generated({
                error: 'Error while creating the Steam account! Check console for details!'
            });
            return;
        }

        var account = await new Promise(function (resolve, reject) {
            $.ajax({
                url: 'https://accgen.cathook.club/userapi/recaptcha/addtask',
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
                on_generated(err);
                return;
            }
            on_generated({
                error: 'Error returned by SAG backend! Check console for details!'
            });
            return;
        }
        on_generated(account);
    }, false);
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

function on_generated(acc_data) {
    document.getElementById('innerdiv').src = "https://store.steampowered.com/join/";
    $("#generate_progress").hide();
    $("#recap_steam").hide();
    $("#custom_domain_button").show();
    $("#generate_button").show("slow");
    if (localStorage.getItem("genned_account") != null) {
        $('#history_button').show();
    }

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
    $("#generated_data").show("slow")
}

function custom_domain_pressed() {
    $("#save_settings").text("Save");
    $("#custom_domain_div_parent").toggle('slow');
    $("#mx_error").hide("slow");
}


function save_settings() {
    $('input[type="text"]').each(function () {
        var id = $(this).attr('id');
        var value = $(this).val();
        localStorage.setItem(id, value);
    });
    $("#save_settings").text("Saved!");
    $("#custom_domain_div_parent").toggle('slow');
}

function settings_help() {
    window.open("https://i.imgur.com/zxBii8n.png");
}

function load_settings() {
    $('input[type="text"]').each(function () {
        var id = $(this).attr('id');
        var value = localStorage.getItem(id);
        $(this).val(value);
    });
}

function generate_pressed() {
    $("#innerdiv").show()
    $("#generated_accs_table_card").hide();
    $("#generate_button").hide();
    $("#recap_steam").show();
    $("#generated_data").hide();
    $("#generate_error").hide();
}

async function save_clicked() {
    gtag('event', 'settings_saved');
    if ($("#settings_custom_domain").val() == "") {
        save_settings();
        $("#mx_error").hide("slow");
        return;
    }

    if (await isvalidmx($("#settings_custom_domain").val())) {
        save_settings();
        $("#mx_error").hide("slow");
    } else {
        $("#mx_error").show("slow");
        $("#settings_custom_domain").val("")
    }
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
    setInterval(perform_status_check, 10000);
    perform_status_check();
    registerevents();

    // Check if addon installed
    $.ajax({
        url: "https://store.steampowered.com/join/"
    }).done(function () {
        $("#generate_button").show();
        $("#custom_domain_button").show();
    }).fail(function (resp) {
        $("#addon_dl").show();
        $("#accgen_ui").hide();
        $("#generate_button").hide();
    });
    load_settings()
    changeText();
}