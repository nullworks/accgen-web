global.$ = require("jquery");
require("bootstrap");
var DOMPurify = require("dompurify");

global.startPolling = function () {
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
                if (!$("#polling_email").is(":visible")) {
                    $("#acc_email").html(`Waiting for emails at <strong>${returnData.address}</strong>`);
                    $("#polling_email").show("slow");
                }
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