/* 
 * This script runs in "post_explanation.html" (after initial test)
 * and displays the correct buttons/elements in page according to group
 */
 
 // get access to "background.js"
var backgroundPage = chrome.extension.getBackgroundPage();
 
window.onload = function() {
	$('#english').click(function(){
		backgroundPage.settings['lang'] = 0;
		chrome.tabs.update({url: chrome.extension.getURL("html/post_explanation_eng.html")});
	});
	$('#hebrew').click(function(){
		backgroundPage.settings['lang'] = 1;
		chrome.tabs.update({url: chrome.extension.getURL("html/post_explanation_heb.html")});
	});
	// for control group
	if (backgroundPage.groupData['group'] === "control"){
		// display control section
		$('#control').css('display', '');
		// when user clicks button, update server and take him to phishing game
		$('#control_button').click(function(){
			backgroundPage.settings['in_training'] = true;
			backgroundPage.settings['in_init_test'] = true;
			chrome.runtime.sendMessage({method: 'logAction', action: 'started_game', data: 'control_group', hostname: "good_luck"});
			window.location.href = "http://www.ucl.ac.uk/cert/antiphishing/";
		});
	}
	// for image group
	else if (backgroundPage.groupData['group'] === "image"){
		// display image sections
		$('#image_button_feedback').css('display', '');
		$('#image_button').css('display', '');
		$('#image').css('display', '');
		// when user clicks button, update server, and take to first link in training phase
		$('#button_feedback_image').click(function(){
			backgroundPage.settings['in_training'] = true;
			backgroundPage.settings['in_init_test'] = true;
			chrome.runtime.sendMessage({method: 'logAction', action: 'started_training', data: 'image_group', hostname: "good_luck"});
			var next_url = "https://www.linkedin.com/start/join?trk=login_reg_redirect&session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fpeople%2Fpymk%2Fhub%3Fref%3Dglobal-nav%26trk%3Dnav_utilities_invites_header";
			// first delete cookies so there's no special info there
			delete_cookies(next_url);
			window.location.href = next_url;
		});
	}
	// for button group
	else if (backgroundPage.groupData['group'] === "button"){
		// display button sections
		$('#image_button_feedback').css('display', '');
		$('#image_button').css('display', '');
		$('#button').css('display', '');
		$('#button_feedback_image').css('display', '');
		// when user clicks button, update server, and take to first link in training phase
		$('#button_feedback_image').click(function(){
			backgroundPage.settings['in_training'] = true;
			backgroundPage.settings['in_init_test'] = true;
			chrome.runtime.sendMessage({method: 'logAction', action: 'started_training', data: 'button_group', hostname: "good_luck"});
			var next_url = "https://www.linkedin.com/start/join?trk=login_reg_redirect&session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fpeople%2Fpymk%2Fhub%3Fref%3Dglobal-nav%26trk%3Dnav_utilities_invites_header";
			// first delete cookies so there's no special info there
			delete_cookies(next_url);
			window.location.href = next_url;
		});
	}
	// for feedback group
	else if (backgroundPage.groupData['group'] === "feedback"){
		// display feedback sections
		$('#image_button_feedback').css('display', '');
		$('#feedback').css('display', '');
		$('#button_feedback_image').css('display', '');
		// when user clicks button, update server, and take to first link in training phase
		$('#button_feedback_image').click(function(){
			backgroundPage.settings['in_training'] = true;
			backgroundPage.settings['in_init_test'] = true;
			chrome.runtime.sendMessage({method: 'logAction', action: 'started_training', data: 'feedback_group', hostname: "good_luck"});
			var next_url = "https://www.linkedin.com/start/join?trk=login_reg_redirect&session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fpeople%2Fpymk%2Fhub%3Fref%3Dglobal-nav%26trk%3Dnav_utilities_invites_header";
			// first delete cookies so there's no special info there
			delete_cookies(next_url);
			window.location.href = next_url;
		});
	}
}

// function that deletes cookies for specific site (uses "background.js")
function delete_cookies(url){
	var matches = url.match(/^https?\:\/\/(?:www\.)?([^\/?#]+)(?:[\/?#]|$)/i);
	var main_domain = matches && matches[1];
	var protocol_array = url.split(":");
	var protocol = protocol_array[0] + "://";
	chrome.cookies.getAll({domain: main_domain}, function(cookies) {
		for (var i=0; i<cookies.length; i++) {
			chrome.cookies.remove({url: protocol + cookies[i].domain + cookies[i].path, name: cookies[i].name});
		}
	});
}