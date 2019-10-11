global.$ = require("jquery");
require("bootstrap");
var DOMPurify = require("dompurify");

function displayerror(errortext) {
    if (errortext) {
        $("#generic_error").show("slow");
        $("#generic_error").text(errortext);
    } else
        $("#generic_error").hide("slow");
}

global.startPolling = function () {
    $("#submit").hide("slow");
    $.ajax({
        url: '/userapi/pollemails',
        method: 'POST',
        dataType: 'json',
        contentType: 'application/json',
        data: JSON.stringify({
            username: $("#username").val(),
            password: $("#password").val(),
        }),
        success: async function (returnData) {
            if (!$("#polling_email").is(":visible")) {
                $("#acc_email").html(`Waiting for emails at <strong>${returnData.address}</strong>`);
                $("#polling_email").show("slow");
                $("#recovered_email").hide("slow");
                displayerror(undefined);
            }
            if (returnData.email != "") {
                $("#submit").show("slow");
                document.getElementById("email_content").innerHTML = DOMPurify.sanitize(returnData.email);
                $("#email_display").modal('show');
                $("#email_display").css('padding-right', '27rem')
                $("#polling_email").hide("slow");
            } else {
                setTimeout(startPolling, 5000);
            }
        },
        error: function (xhr, status, error) {
            $("#submit").show("slow");
            $("#polling_email").hide("slow");
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