// only for inserting user ID into questionnaire secretly, so we know who each user is
var backgroundPage = chrome.extension.getBackgroundPage();
window.onload = function() {
	var hidden_field = document.getElementById('entry_33265551');
	hidden_field.value = backgroundPage.user_id;
	document.getElementById("ss-submit").onclick = submit_handler;
};

function submit_handler(){
	var email = document.getElementById('entry_2109046221').value;
	chrome.runtime.sendMessage({method: 'set', key: 'email', value: email});
}