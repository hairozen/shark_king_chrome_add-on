/* 
 * This script runs in the settings page and mangages
 * the whitelist/blacklist functions
 */

// get access to "background.js"
var backgroundPage = chrome.extension.getBackgroundPage();
var otherList = "";

// initialize lists and display on page
init();
function init() {
	initList('whitelist');
	initList('blacklist');
}

// initialize whitelist/blacklist and display on page
function initList(listName) {
	// input box for users to input URL to add to list
	var input = document.getElementById(listName + '_input');
	// let user click "enter" to add site to list
	input.onkeyup = function (e) {
		if (e.keyCode == 13) {
			addHandler(listName, input.value);
		}
	}
	// also allow "add" button to do the same
	var addButton = document.getElementById(listName + '_button');
	addButton.onclick = function (e) {
		addHandler(listName, input.value);
	}
	// create list and display on page
	var parent = document.getElementById(listName + '_ol');
	var list = backgroundPage.settings[listName];
	for (var i = 0; i < list.length; i++) {
		parent.appendChild(makeItem(list[i], listName));
	};
}

// helps creating the list (builds elements)
function makeItem (url, listName) {
	// builds the necessary elements for the list
	var item = document.createElement('li');
	var div = document.createElement('div');
	var a = document.createElement('a');
	var input = document.createElement('input');
	div.style.display = "block";
	a.textContent = url;
	a.style.display = "block";
	a.style.width = "600px";
	a.style.height = "25px";
	input.type = "image";
	input.src = "https://cdn0.iconfinder.com/data/icons/rcorners/512/Trash-512.png";
	input.alt = "Submit";
	input.width = "22";
	input.height = "22";
	input.style.position = "absolute"; 
	input.style.top = "7px"; 
	input.style.left = "602px";
	// set "onclick" function for "trash" icon - remove from list
	input.onclick = function () {removeButtonHandler(url, listName);};
	a.appendChild(input);
	div.appendChild(a);
	item.appendChild(div);
	return item;
}

// remove URL from list (trash icon)
function removeButtonHandler(url, listName) {
	// remove URL from list
	backgroundPage.removeFromList(listName, url);
	// delete list from page
	var lists = document.getElementsByTagName('ol');
	for (var i = 0; i < lists.length; i++) {
		var parent = lists[i];
		while (parent.firstChild) {
    		parent.removeChild(parent.firstChild);
		}
	}
	// update server of removal
	chrome.runtime.sendMessage({method: 'logAction', action: listName + '_remove', hostname: 'settings', data: url});
	// call "init" for re-displaying updated list
	init();
}

// add site to list
function addHandler(listName, url) {
	if (listName === 'whitelist'){
		url = normalizeURL(url);
		otherList = 'blacklist';
	}
	else{
		otherList = 'whitelist';
		// if user is adding site to blacklist and either "showAd" or "showModal" attacks are active, show appropriate message
		if (backgroundPage.settings['attack'] === 'showAd' || backgroundPage.settings['attack'] === 'showModal'){
			chrome.tabs.sendMessage(tab.id, {method: 'showBlackListDialog', suspicious_url: url});
			return;
		}
		// if user blacklists a site and the fake site redirection attack is active - good job!
		else if (backgroundPage.settings['attack'] === 'fakeSiteRedirect') {
			chrome.runtime.sendMessage({method: 'registerOutcome', success: true, feedback: [null, "You've marke a suspect website correctly, great job!"]});
			chrome.runtime.sendMessage({method: 'logAction', action: 'blacklist_add', hostname: 'fake_domain_success', data: 'success'});
		}
	}
	// add site to list
	backgroundPage.addToList(listName, url);
	// remove site from other list (if needed)
	backgroundPage.removeFromList(otherList, url);
    window.location.reload(false); 
	// update server
	chrome.runtime.sendMessage({method: 'logAction', action: listName + '_add', hostname: 'settings', data: url});
}

// auxiliary function for cleaning up URL (only protocol with 3 first elements, e.g. "https://www.google.com/")
function normalizeURL(url) {
    var urlParts = url.split('/');
    urlParts = urlParts.slice(0, 3).concat([""]);
    return urlParts.join('/');
}