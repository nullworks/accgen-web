function submit_clicked() {
    $("#error_invalid").hide();
    $("#error_others").hide();
    $("#recovered_email").hide();

    if ($("#username").val() == "" || $("#password").val() == "") {
        $("#error_invalid").show();
        return;
    }
    $.ajax({
        url: 'https://accgen.cathook.club/userapi/retrieveemail',
        method: 'POST',
        dataType: 'json',
        contentType: 'application/json',
        data: JSON.stringify({
            username: $("#username").val(),
            password: $("#password").val()
        }),
        success: function (returnData) {
            $("#acc_email").html(`Email: <strong>${returnData.email}</strong>`);
            $("#recovered_email").show("slow")

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