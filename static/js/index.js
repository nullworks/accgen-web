"let strict";

var multiple = false;

function init() {
	$("#generate_error").hide()
	$("#generate_progress").hide()
	$("#generated_data").hide()
	$("#acc_email").hide()
}

function on_count_received(resp) {
	$("#account_count").prop("count", (localStorage.getItem("accounts") || 0)).animate({
		count: parseInt(resp)
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
	$("#generated_data").show("slow")
	$("#generate_button").show("slow")
}

function on_captcha_valid(token) {
	init()

	$("#generate_button").hide()
	$("#generate_progress").show("slow")

	$.ajax({
		url: "https://catbot.club:2053/acc/v2/" + token
	}).done(function (resp) {
		on_generated(resp)
	})

	grecaptcha.reset()
}

var v3_loaded = false;
var v2_loaded = false;

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}
async function generate_multiple_pressed() {
	multiple = true;
	while (!v3_loaded) {
		await sleep(50)
	}

	grecaptcha.execute()
}
async function generate_pressed() {
	while (!v3_loaded || !v2_loaded) {
		await sleep(50)
	}
	// run v3
	grecaptcha.execute('6LfG55kUAAAAANVoyH7VqYns6j_ZpxB35phXF0bM', {
		action: 'generate'
	}).then(function (res) {
		init()
		$("#generate_button").hide()
		$("#generate_progress").show("slow")

		$.ajax({
			url: "https://catbot.club:2053/acc/v3/" + res
		}).done(function (resp) {
			if (!resp.v2)
				on_generated(resp)
			else {
				$("#generate_button").show("slow")
				$("#generate_progress").hide()
				// run v2
				grecaptcha.execute()
			}
		})
	})
}

function on_v2_load() {
	v2_loaded = true
	init()
	setInterval(perform_count_check, 10000)
	perform_count_check();
}

function on_v3_load() {
	v3_loaded = true
	grecaptcha.execute('6LfG55kUAAAAANVoyH7VqYns6j_ZpxB35phXF0bM', {
		action: 'homepage'
	})
}