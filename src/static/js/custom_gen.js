"let strict";

function additionalPatreonInfo(account, update) {
    var profile_data = {
        name: $("input[name=acc_username]").val(),
        realName: $("input[name=acc_realname]").val(),
        summary: $("textarea[name=acc_bio]").val(),
        country: $("select[name=acc_country]").val(),
        state: $("input[name=acc_state]").val(),
        city: $("input[name=acc_city]").val(),
        customURL: $("input[name=acc_profileurl]").val()
    }
    var privacy_data = {
        profile: parseInt($("select[name=profile_privacy]").val()),
        comments: parseInt($("select[name=comments_privacy]").val()),
        inventory: parseInt($("select[name=inv_privacy]").val()),
        inventoryGifts: $('#invgifts_priv').val() == "true",
        gameDetails: parseInt($('#gameDetails_priv').val()),
        playtime: $('#playtime_priv').val() == "true",
        friendsList: parseInt($('#friendsList_priv').val())
    }
    //clear out empty or undefined values
    Object.keys(profile_data).forEach((key) => { if (profile_data[key] === "") { delete profile_data[key] } })
    Object.keys(privacy_data).forEach((key) => { if (privacy_data[key] === "") { delete privacy_data[key] } })

    return {
        profile: profile_data,
        privacy: privacy_data,
        image: $("input[name=acc_profileimage]").val(),
    };
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