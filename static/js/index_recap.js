"let strict";

function stringifyQueryString(params) {
    return queryString = Object.keys(params).map(key => key + '=' + params[key]).join('&');
}

function registerevents() {
    var eventMethod = window.addEventListener ? "addEventListener" : "attachEvent";
    var eventer = window[eventMethod];
    var messageEvent = eventMethod == "attachEvent" ? "onmessage" : "message";

    eventer(messageEvent, function (e) {
        if (e.data == "recaptcha-setup")
            return;
        $("#generate_button").hide();
        $("#generate_progress").show("slow");
        $("#recap_steam").hide();

        $.ajax({
            url: 'https://accgen.cathook.club/userapi/recaptcha/getemail'
        }).done(function (emailresp) {
            $.ajax({
                url: "https://store.steampowered.com/join/"
            }).done(function (resp) {
                var gid = resp.split('id="captchagid" value="')[1].split("\"")[0];
                $.ajax({
                    url: "https://store.steampowered.com/join/ajaxverifyemail",
                    method: 'POST',
                    data: stringifyQueryString({
                        email: emailresp.email,
                        captchagid: gid,
                        captcha_text: e.data
                    })
                }).done(function (resp) {
                    switch (resp.success) {
                        case 17:
                            on_generated({
                                error: 'Email Domain banned.. Please wait for us to update it'
                            })
                            break;
                        case 101:
                            on_generated({
                                error: 'Recaptcha solution incorrect!'
                            });
                            break;
                        case 1:
                            $.ajax({
                                url: "https://accgen.cathook.club/userapi/recaptcha/addtask/" + emailresp.email
                            }).done(function (resp) {
                                on_generated(resp)
                                console.log(resp);
                            }).fail(function (resp) {
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
            }).fail(function (resp) {
                on_generated({
                    error: "Failed to fetch Steam's page. You might not have the addon installed"
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
    }).fail(function (resp) {
        $("#addon_dl").show();
        $("#accgen_ui").hide();
    });
}

async function installFFAddon()
{
  InstallTrigger.install({'Steam Account Helper':'https://addons.mozilla.org/firefox/downloads/file/2402583/sag-latest.xpi'});
  await sleep(500);
  document.getElementById('ffaddon').href='https://addons.mozilla.org/en-US/firefox/addon/sag/'; //if above failed
  document.getElementById('ffaddon').target="_blank"; //new tab
  document.getElementById('ffaddon').onclick=""; //remove prompt
}

function generate_pressed() {
    $("#generated_accs_table_card").hide();
    $("#generate_button").hide();
    $("#recap_steam").show();
    $("#generated_data").hide();
    $("#generate_error").hide();
}