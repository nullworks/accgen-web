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
        if (e.data.split(";").length != 2) {
            alert("Invalid data received from steam");
            return;
        }
        var gid = e.data.split(";")[1];
        var recap_token = e.data.split(";")[0];
        $("#generate_progress").show("slow");
        $('#recap').hide();
        $('#accgen_ui').hide();
        $("#generate_error").hide();
        $("#generated_data").hide();

        localStorage.setItem("custom_gen_settings", JSON.stringify({
            name: $("input[name=acc_username]").val(),
            realName: $("input[name=acc_realname]").val(),
            summary: $("textarea[name=acc_bio]").val(),
            country: $("select[name=acc_country]").val(),
            state: $("input[name=acc_state]").val(),
            city: $("input[name=acc_city]").val(),
            customURL: $("input[name=acc_profileurl]").val(),
            image: $("input[name=acc_profileimage]").val()
        }))

        var err = undefined;
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
                    email: data.email,
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
                    email: data.email
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
                    email: data.email
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

        $.ajax({
            url: `https://accgen.cathook.club/userapi/patreon/customacc/${account.login}/${account.password}`,
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                name: $("input[name=acc_username]").val(),
                realName: $("input[name=acc_realname]").val(),
                summary: $("textarea[name=acc_bio]").val(),
                country: $("select[name=acc_country]").val(),
                state: $("input[name=acc_state]").val(),
                city: $("input[name=acc_city]").val(),
                customURL: $("input[name=acc_profileurl]").val(),
                image: $("input[name=acc_profileimage]").val()
            }),
            dataType: 'json'
        }).done(function (data) {
            data.steamid = account.steamid;
            on_generated(data);
        }).fail(function (xhr, status, error) {
            on_generated(JSON.parse(xhr.responseText));
        });
    }, false);
}

function on_generated(acc_data) {
    $("#generate_progress").hide();
    $("#recap").show();
    $("#accgen_ui").show();
    document.getElementById('innerdiv').src = "https://store.steampowered.com/join/";

    if (acc_data.error) {
        $("#generate_error").show("slow")
        $("#generate_error_text").html(acc_data.error);
        $("#generate_button").show("slow")
        if (localStorage.getItem("genned_account") != null) {
            //$('#history_button').show();
        }
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
    $("#generate_button").show("slow")
    if (localStorage.getItem("genned_account") != null) {
        //$('#history_button').show();
    }
}

function onload() {
    registerevents();
    var data = localStorage.getItem("custom_gen_settings");
    if (data != null) {
        data = JSON.parse(data);
        $("input[name=acc_username]").val(data.name);
        $("input[name=acc_realname]").val(data.realName);
        $("textarea[name=acc_bio]").val(data.summary);
        $("select[name=acc_country]").val(data.country);
        $("input[name=acc_state]").val(data.state);
        $("input[name=acc_city]").val(data.city);
        $("input[name=acc_profileurl]").val(data.customURL);
        $("input[name=acc_profileimage]").val(data.image);
    }

    $.ajax({
        url: 'https://accgen.cathook.club/patreon/check',
        type: 'GET'
    }).done(function (data) {
        /*  0 - success
            1 - login
            2 - needs to pledge
            3 - unknown error
        */
        data = parseInt(data);

        switch (data) {
            case 1:
                $('#patreon_signin').show();
                $('#accgen_ui').hide();
                $('#recap').hide()
                $("#generate_button").hide();
                break;
            case 2:
                $('#patreon_pay').show();
                $('#accgen_ui').hide();
                $('#recap').hide()
                $("#generate_button").hide();
                break;
            case 3:
                $('#patreon_error').show();
                $('#accgen_ui').hide();
                $('#recap').hide()
                $("#generate_button").hide();
                break;
            case 0:
                $.ajax({
                    url: "https://store.steampowered.com/join/"
                }).done(function () {
                    $("#generate_button").show();
                }).fail(function () {
                    $("#addon_dl").show();
                    $("#accgen_ui").hide();
                    $("#recap").hide();
                    //$("#history_button").hide();
                });
                break;
        }
    }).fail(function () {
        $('#patreon_error').show();
        $('#accgen_ui').hide();
        //$("#history_button").hide();
        return
    });

}