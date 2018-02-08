// when all initial phase is done - store flags locally so user can surf freely form now on. also set up real default whitelist
var backgroundPage = chrome.extension.getBackgroundPage();
window.onload = function() {
	$('#english').click(function(){
		backgroundPage.settings['lang'] = 0;
		chrome.tabs.update({url: chrome.extension.getURL("html/init_done_eng.html")});
	});
	$('#hebrew').click(function(){
		backgroundPage.settings['lang'] = 1;
		chrome.tabs.update({url: chrome.extension.getURL("html/init_done_heb.html")});
	});
	if(backgroundPage.groupData['group'] === "button"){
		$('#button_1').css('display', '');
		$('#button_2').css('display', '');
		$('#button_image').css('display', '');
	}
	else if (backgroundPage.groupData['group'] === "image"){
		$('#button_image').css('display', '');
		$('#image').css('display', '');
	}
	chrome.runtime.sendMessage({method: 'set', key: 'in_init_test',	value: false});
	chrome.runtime.sendMessage({method: 'set', key: 'init_done', value: true});
	chrome.runtime.sendMessage({method: 'set', key: 'final_test', value: false});
	chrome.runtime.sendMessage({method: 'set', key: 'in_training',	value: false});
	chrome.runtime.sendMessage({method:'setup_whitelist'});
	var init_done_time = new Date().getTime();
	chrome.storage.local.set({'init_done_time': init_done_time});
	$("#unique").attr("src", backgroundPage.settings['rightImagePath'] + "?id=" + backgroundPage.user_id);
	chrome.runtime.sendMessage({method: 'logAction', action: 'mode_update', data: 'mode_0_set', hostname: 'init_done'});
}