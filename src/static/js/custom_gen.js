"let strict";

async function post_generate(account, update) {
    update("Applying custom generator settings...");
    await httpRequest({
        url: `/userapi/patreon/customacc/${account.account.login}/${account.account.password}`,
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            profile: {
                name: $("input[name=acc_username]").val(),
                realName: $("input[name=acc_realname]").val(),
                summary: $("textarea[name=acc_bio]").val(),
                country: $("select[name=acc_country]").val(),
                state: $("input[name=acc_state]").val(),
                city: $("input[name=acc_city]").val(),
                customURL: $("input[name=acc_profileurl]").val()
            },
            image: $("input[name=acc_profileimage]").val(),
            privacy:
            {
                profile: $("select[name=profile_privacy]").val(),
                comments: $("select[name=comments_privacy]").val(),
                inventory: $("select[name=inv_privacy]").val(),
                inventoryGifts: $('#invgifts_priv').val() == "true",
                gameDetails: $('#gameDetails_priv').val(),
                playtime: $('#playtime_priv').val() == "true",
                friendsList: $('#friendsList_priv').val()
            }
        }),
        dataType: 'json'
    }).catch(function (resp) {
        if (resp.error) {
            account.error.message = resp.error;
            account.account = null;
        } else {
            account.error.message = "Unknown error!";
            account.account = null;
        }
    });
    return account;
}

function generate_pressed() {
    commonGeneratePressed();
    // Save settings
    localStorage.setItem("custom_gen_settings", JSON.stringify({
        name: $("input[name=acc_username]").val(),
        realName: $("input[name=acc_realname]").val(),
        summary: $("textarea[name=acc_bio]").val(),
        country: $("select[name=acc_country]").val(),
        state: $("input[name=acc_state]").val(),
        city: $("input[name=acc_city]").val(),
        customURL: $("input[name=acc_profileurl]").val(),
        image: $("input[name=acc_profileimage]").val(),
        profile_priv: $('#profile_privacy').val(),
        comments_priv: $('#comments_privacy').val(),
        inventory_priv: $('#inv_privacy').val(),
        invgifts_priv: $('#invgifts_priv').val(),
        gameDetails_priv: $('#gameDetails_priv').val(),
        playtime_priv: $('#playtime_priv').val(),
        friendsList_priv: $('#friendsList_priv').val()
    }))
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
        $('#profile_privacy').val(data.profile_priv);
        $('#comments_privacy').val(data.comments_priv);
        $('#inv_privacy').val(data.inventory_priv);
        $('#invgifts_priv').val(data.invgifts_priv);
        $('#gameDetails_priv').val(data.gameDetails_priv);
        $('#playtime_priv').val(data.playtime_priv);
        $('#friendsList_priv').val(data.friendsList_priv);

    }

    $.ajax({
        url: '/userapi/patreon/check',
        type: 'GET',
        dataType: "json"
    }).done(function (data) {
        /*  0 - success
            1 - login
            2 - needs to pledge
            3 - unknown error
        */

        switch (data.customgen) {
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