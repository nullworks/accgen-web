"let strict";

function init() {
	$("#generate_error").hide()
	$("#generate_progress").hide()
	$("#generated_data").hide()
	perform_count_check()
}

function on_count_received(resp) {
	$("#account_count").prop("count", 0).animate({
		count: parseInt(resp)
	}, {
		duration: 4000,
		easing: 'swing',
		step: function(now) {
			$("#account_count").text(Math.ceil(now))
		}
	})
}

function perform_count_check() {
	$.ajax({
		url: "https://accgen.inkcat.net:6969/count"
	}).done(function(resp) {
		on_count_received(resp)
	})
	
	setTimeout(perform_count_check, 60000)
}

function on_generated(acc_data) {
	$("#generate_progress").hide()
	
	if (acc_data.error) {
		$("#generate_error").show("slow")
		$("#generate_error_text").text(acc_data.error)
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