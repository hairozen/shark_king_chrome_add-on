/* 
 * This script runs in "before_final_test.html"
 */
var backgroundPage = chrome.extension.getBackgroundPage();
window.onload = function() {
	$('#english_link').click(function(){
		$('#content_english').css('display', '');
		$('#content_hebrew').css('display', 'none');
		backgroundPage.settings['lang'] = 0;
	});
	$('#hebrew_link').click(function(){
		$('#content_hebrew').css('display', '');
		$('#content_english').css('display', 'none');
		backgroundPage.settings['lang'] = 1;
	});
	if (backgroundPage.settings['lang'] === 0){
		$('#content_english').css('display', '');
		$('#content_hebrew').css('display', 'none');
	}
	else if (backgroundPage.settings['lang'] === 1){
		$('#content_hebrew').css('display', '');
		$('#content_english').css('display', 'none');
	}
	// when user begins final test - first insert this test's "good" sites to (temporary) whitelist, update server and take to first site in test
	$('#start_final_test_eng,#start_final_test_heb').click(function(){
		backgroundPage.settings['final_test'] = true;
		backgroundPage.settings['in_init_test'] = true;
		if(backgroundPage.groupData['phishing_number'] === 0){
			backgroundPage.settings['whitelist'].push("https://passport.dx.com/");
			backgroundPage.settings['whitelist'].push("https://login.yahoo.com/");
			backgroundPage.settings['whitelist'].push("https://sso.compassmanager.com/");
			backgroundPage.settings['whitelist'].push("http://lemida.biu.ac.il/");
			backgroundPage.settings['whitelist'].push("https://www.hot.net.il/");
			chrome.runtime.sendMessage({method: 'logAction', action: 'started_final_test', data: 'phishing_number_0', hostname: backgroundPage.groupData['group']});
			chrome.tabs.update({url: "https://www.facebok-secure.com/login.php/facebook.com/"});
		}
		else if (backgroundPage.groupData['phishing_number'] === 1){
			backgroundPage.settings['whitelist'].push("https://www.torrentday.com/");
			backgroundPage.settings['whitelist'].push("https://www.adikastyle.com/");
			backgroundPage.settings['whitelist'].push("http://www.bgu4u.co.il/");
			backgroundPage.settings['whitelist'].push("https://online.bankotsar.co.il/");
			backgroundPage.settings['whitelist'].push("https://www.pinterest.com/");
			chrome.runtime.sendMessage({method: 'logAction', action: 'started_final_test', data: 'phishing_number_1', hostname: backgroundPage.groupData['group']});
			chrome.tabs.update({url: "https://login-facebok.com/login.php/next=www.facebook.com.html"});
		}
	});
}