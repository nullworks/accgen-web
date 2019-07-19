function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function EmailAccessCheck() {
    $("#mass_generator").modal('hide');
    $("#recovered_email").hide("slow");
    displayerror(undefined);
    $("#submit").hide("slow");

    if ($("#username").val() == "" || $("#password").val() == "") {
        $("#error_invalid").show();
        return;
    }
    $.ajax({
        url: '/userapi/pollemails',
        method: 'POST',
        dataType: 'json',
        contentType: 'application/json',
        data: JSON.stringify({
            username: $("#username").val(),
            password: $("#password").val(),
            check: true
        }),
        success: async function (returnData) {
            $("#acc_email").html(`Waiting for emails at <strong>${returnData.email}</strong>`);
            $("#polling_email").show("slow");
            startPolling($("#username").val(), $("#password").val());
        },
        error: function (xhr, status, error) {
            $("#submit").show("slow");
            try {
                var res = JSON.parse(xhr.responseText);
                if (res.error)
                    displayerror(res.error);
                else
                    throw new Error("Object does not contain .error!")
            } catch (error) {
                displayerror("Unknown error! Please try again later.");
            }
        }
    })
}

function displayerror(errortext) {
    if (errortext) {
        $("#generic_error").show("slow");
        $("#generic_error").text(errortext);
    } else
        $("#generic_error").hide("slow");
}

function startPolling(user, pass) {
    $.ajax({
        url: '/userapi/pollemails',
        method: 'POST',
        dataType: 'json',
        contentType: 'application/json',
        data: JSON.stringify({
            username: user,
            password: pass,
            check: false
        }),
        success: async function (returnData) {
            if (returnData.email != "") {
                $("#submit").show("slow");
                document.getElementById("email_content").innerHTML = DOMPurify.sanitize(returnData.email);
                $("#email_display").modal('show');
                $("#email_display").css('padding-right', '27rem')
                $("#polling_email").hide("slow");
            } else {
                setTimeout(startPolling, 5000, user, pass);
            }
        },
        error: function (xhr, status, error) {
            $("#submit").show("slow");
            try {
                var res = JSON.parse(xhr.responseText);
                if (res.error)
                    displayerror(res.error);
                else
                    throw new Error("Object does not contain .error!")
            } catch (error) {
                displayerror("Unknown error! Please try again later.");
            }
        }
    })
}