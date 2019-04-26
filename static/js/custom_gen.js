"let strict";

function on_generated(acc_data) {
  $("#generate_progress").hide()

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

function custom_gen() {
  $("#generate_progress").show("slow");
  $("#generate_button")[0].disabled = true;
  var img_url = $("input[name=acc_profileimage]").val();
  if (img_url == "")
    img_url =
    "https://steamuserimages-a.akamaihd.net/ugc/885384897182110030/F095539864AC9E94AE5236E04C8CA7C2725BCEFF/";
  $.ajax({
    url: 'https://accgen.cathook.club/userapi/patreon/customacc',
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
      image: img_url,
    }),
    dataType: 'json'
  }).done(function(data) {
    $("#generate_button")[0].disabled = false;
    $("#generate_progress").hide()
    on_generated(data)
  }).fail(function(xhr, status, error) {
    $("#generate_error").show("slow")
    $("#generate_error_text").text(xhr.responseText)
    $("#generate_button")[0].disabled = false;

  });
}

function onload() {
  $.ajax({
    url: 'https://accgen.cathook.club/patreon/check',
    type: 'GET'
  }).done(function(data) {
    /*  0 - needs to login
        1 - all good
        2 - needs to pledge
        3 - unknown error
    */
    data = parseInt(data);

    switch (data) {
      case 0:
        $('#patreon_signin').show();
        $('#generate_acc_form').hide();
        $("#generate_button").hide();
        break;
      case 2:
        $('#patreon_pay').show();
        $('#generate_acc_form').hide();
        $("#generate_button").hide();
        break;
      case 3:
        $('#patreon_error').show();
        $('#generate_acc_form').hide();
        $("#generate_button").hide();
        break;

    }

  });
}