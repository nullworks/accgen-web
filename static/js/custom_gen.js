"let strict";

async function post_generate(account) {
    change_gen_status_text("Applying custom generator settings...");
    var data = await httpRequest({
        url: `/userapi/patreon/customacc/${account.login}/${account.password}`,
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
    }).catch(function (xhr) {
        displayData(xhr)
    });
    if (!data)
        return;
    data.steamid = account.steamid;
    return data;
}

function generate_pressed() {
    commonGeneratePressed();
}

function change_visibility(status) {
    if (status == 1)
        $('custom_gen_form').show('hide');
    else if (!status)
        $('custom_gen_form').show('slow');
    commonChangeVisibility(status);
}

function init() {
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
        url: '/patreon/check',
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
                common_init();
        }
    }).fail(function () {
        $('#patreon_error').show();
        $('#accgen_ui').hide();
        //$("#history_button").hide();
        return
    });

}