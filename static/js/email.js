function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function EmailAccessCheck() {
    $("#mass_generator").modal('hide');
    $("#error_invalid").hide();
    $("#error_others").hide();
    $("#recovered_email").hide();

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
            console.error(xhr);
            switch (xhr.status) {
                case 400:
                    $("#error_invalid").show();
                    break;
                default:
                    $("#error_others").show();
                    break;
            }
        }
    })
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
                $("#email_content").html(DOMPurify.sanitize(returnData.email));
                $("#email_display").modal('show');
                $("#polling_email").hide("slow");
            }
            else {
                await sleep(5000);
                startPolling(user, pass);
            }
        },
        error: function (xhr, status, error) {
            /* for some reason it times out rarely.. could result in loss of emails?
               switch (xhr.status) {
                   case 400:
                       $("#error_invalid").show();
                       break;
                   default:
                       $("#error_others").show();
                       break;
               }
               */
        }
    })
}