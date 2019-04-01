"let strict";

var multiple = false;

function init() {
	$("#generate_error").hide()
	$("#generate_progress").hide()
	$("#generated_data").hide()
}

function on_count_received(resp) {
	$("#account_count").prop("count", (localStorage.getItem("accounts") || 0)).animate({
		count: parseInt(-1*resp)
	}, {
		duration: 4000,
		easing: 'swing',
		step: function (now) {
			$("#account_count").text(Math.ceil(now))
		}
	})

	localStorage.setItem("accounts", resp)
}

function perform_count_check() {
	$.ajax({
		url: "https://catbot.club:2053/count"
	}).done(function (resp) {
		on_count_received(resp)
	})

	setTimeout(perform_count_check, 10000)
}

function on_generated(acc_data) {
	$("#generate_progress").hide()

	if (acc_data.error) {
		$("#generate_error").show("slow")
		$("#generate_error_text").text(acc_data.error)
		return;
	}
	if(!multiple)
	{
	$("#acc_login").html(`Login: <strong>${acc_data.login}</strong>`)
	$("#acc_pass").html(`Password: <strong>${acc_data.password}</strong>`)
	if (acc_data.email == "not_user_accessible_sorry")
		$("#acc_email").hide();
	else {
		$("#acc_email").show();
		$("#acc_email").html(`E-Mail address: <a href="https://inboxkitten.com/inbox/${acc_data.email.split("@")[0]}/list" target="_blank">${acc_data.email}</a>`)
	}
	}else
	{
		$("#acc_login").html(`Logins: <strong>${acc_data.login}</strong>, <strong>${acc_data.login}</strong>`)
	$("#acc_pass").html(`Password: <strong>${acc_data.password}</strong>, <strong>${acc_data.password}</strong>`)
	$("#acc_email").hide();
	
	}
	$("#generated_data").show("slow")
	$("#generate_button").show("slow")
}

function on_captcha_valid(token) {
	grecaptcha.execute('6LfG55kUAAAAANVoyH7VqYns6j_ZpxB35phXF0bM', {
		action: 'generate'
	}).then(res => {
		return new Promise(function (resolve, reject) {
		init()

		$("#generate_button").hide()
		$("#generate_progress").show("slow")

		$.ajax({
			url: "https://catbot.club:2053/account/" + token + "/" + res
		}).done(function (resp) {
			on_generated(resp)
		})

		grecaptcha.reset()
		resolve()
	})
	});
}

var v3_loaded = false;

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}
async function generate_multiple_pressed(){
	multiple=true;
	while (!v3_loaded) {
		await sleep(50)
	}

		grecaptcha.execute()
}
async function generate_pressed() {
	multiple=false;
	while (!v3_loaded) {
		await sleep(50)
	}

		grecaptcha.execute()
}

function on_v2_load() {
	init()
	perform_count_check()
}

function on_v3_load() {
	grecaptcha.execute('6LfG55kUAAAAANVoyH7VqYns6j_ZpxB35phXF0bM', {
		action: 'homepage'
	}).then(res => {
		v3_loaded = true
	})
}
