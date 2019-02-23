"let strict";

function init() {
	$("#generate_error").hide()
	$("#generate_progress").hide()
	$("#generated_data").hide()
	perform_count_check()
}

function captcha_init() {
	init()
	
	grecaptcha.render(document.getElementById("generate_button"), {
		"sitekey": "6Leuh5EUAAAAALediEIgey5dKbm1_P97zvzxjgvC",
		"callback": "on_captcha_valid"
	})
}

function on_count_received(resp) {
	$("#account_count").prop("count", (localStorage.getItem("accounts") || 0)).animate({
		count: parseInt(resp)
	}, {
		duration: 4000,
		easing: 'swing',
		step: function(now) {
			$("#account_count").text(Math.ceil(now))
		}
	})
	
	localStorage.setItem("accounts", resp)
}

function perform_count_check() {
	$.ajax({
		url: "https://catbot.club:2053/count"
	}).done(function(resp) {
		on_count_received(resp)
	})
	
	setTimeout(perform_count_check, 30000)
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
	$("#acc_email").html(`E-Mail address: <a href="https://inboxkitten.com/inbox/${acc_data.email.split("@")[0]}/list" target="_blank">${acc_data.email}</a>`)
	
	$("#generated_data").show("slow")
	$("#generate_button").show("slow")
}

function on_captcha_valid(token) {
	return new Promise(function(resolve, reject) {
		init()
		
		$("#generate_button").hide()
		$("#generate_progress").show("slow")
		
		$.ajax({
			url: "https://catbot.club:2053/account/" + token
		}).done(function(resp) {
			on_generated(resp)
		})
		
		grecaptcha.reset()
		captcha_init()
		resolve()
	})
}

function on_captcha_load() {
	$(captcha_init)
}
