// only for inserting user ID into contact form secretly, so we know who each user is
var backgroundPage = chrome.extension.getBackgroundPage();
window.onload = function() {
	var hidden_field = document.getElementById('entry_182731004');
	hidden_field.value = backgroundPage.user_id;
};