"let strict";

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
var eventMethod = window.addEventListener ? "addEventListener" : "attachEvent";
var eventer = window[eventMethod];
var messageEvent = eventMethod == "attachEvent" ? "onmessage" : "message";

eventer(messageEvent, function (e) {
  if(e.data == "recaptcha-setup")
    return;
       console.log("Got Recap Key: "+e.data);
  $.ajax({
            url: "https://accgen.cathook.club/userapi/addtask/"+e.data
        }).done(function (resp) {
                on_generated(resp.responseJSON)
        }).fail(function(resp){
             on_generated(resp.responseJSON)  })
        
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

function on_captcha_valid(token) {
    init()

    $("#generate_button").hide()
    $("#generate_progress").show("slow")

    $.ajax({
        url: "https://accgen.cathook.club/userapi/acc/v2/" + token
    }).done(function (resp) {
        on_generated(resp)
    })

    grecaptcha.reset()
}

var v3_loaded = false;
var v2_loaded = false;

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function generate_pressed() {
    $("#generated_accs_table_card").hide();
    
    $("#generate_button").hide();
    $("#recap_steam").show()
}

function on_v2_load() {
    v2_loaded = true
    init()
    setInterval(perform_count_check, 10000)
    perform_count_check();
}

function on_v3_load() {
    v3_loaded = true
    grecaptcha.execute('6LfG55kUAAAAANVoyH7VqYns6j_ZpxB35phXF0bM', {
        action: 'homepage'
    })
}