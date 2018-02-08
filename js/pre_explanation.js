/* 
 * This script runs in "pre_explanation.html" 
 * and starts the initial test
 */
 
var backgroundPage = chrome.extension.getBackgroundPage();

window.onload = function() {
	$('#english_link').click(function(){
		$('#content_english').css('display', '');
		$('#content_hebrew').css('display', 'none');
		backgroundPage.settings['lang'] = 0;
		if(backgroundPage.groupData['group'] === "button")
			$('#control_image_feedback_eng').css('display', 'none');
	});
	$('#hebrew_link').click(function(){
		$('#content_hebrew').css('display', '');
		$('#content_english').css('display', 'none');
		backgroundPage.settings['lang'] = 1;
		if(backgroundPage.groupData['group'] === "button")
			$('#control_image_feedback_heb').css('display', 'none');
	});
	// user completed questionnaire, don't direct him there again
	chrome.runtime.sendMessage({method: 'set', key: 'completed_questionnaire', value: true});
	// when "start test" is clicked - determine first site according to phishing number
	$("#start_init_test_eng,#start_init_test_heb").click(function () {
		backgroundPage.settings['in_init_test'] = true;
		if(backgroundPage.groupData['phishing_number'] === 0){
			chrome.runtime.sendMessage({method: 'logAction', action: 'started_initial_test', data: 'phishing_number_0', hostname: backgroundPage.groupData['group']});
			chrome.tabs.update({url: "https://login-facebok.com/login.php/next=www.facebook.com.html"});
		}
		else if (backgroundPage.groupData['phishing_number'] === 1){
			chrome.runtime.sendMessage({method: 'logAction', action: 'started_initial_test', data: 'phishing_number_1', hostname: backgroundPage.groupData['group']});
			chrome.tabs.update({url: "https://www.facebok-secure.com/login.php/facebook.com/"});
		}
	});
	$('#english_link').trigger("click");
}