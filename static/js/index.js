"let strict";

function init() {
	$("#generate_error").hide()
	$("#generate_progress").hide()
	$("#generated_data").hide()
	$("#generate_button").text("Generate an account")
}

function on_generated(acc_data) {
	$("#generate_progress").hide()
	
	if (acc_data.error) {
		$("#generate_error").show("slow")
		$("#generate_error_text").text(acc_data.error + " for Proxy / Generate spam.")
		return;
	}
	
	$("#acc_login").html(`Login: <strong>${acc_data.login}</strong>`)
	$("#acc_pass").html(`Password: <strong>${acc_data.password}</strong>`)
	$("#acc_email").html(`<a href="https://inboxkitten.com/inbox/${acc_data.email.split("@")[0]}/list">E-Mail address: ${acc_data.email}`)
	
	$("#generated_data").show("slow")
	$("#generate_button").show("slow")
	$("#generate_button").text("Generate another account")
}

function on_generate_click() {
	init()
	
	$("#generate_button").hide()
	$("#generate_progress").show("slow")
	
	$.ajax({
		url: "https://accgen.inkcat.net:6969/account"
	}).done(function(resp) {
		on_generated(resp)
	})
}

$(init)
