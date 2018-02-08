/* 
 * This script runs in the background of the extension, and
 * runs as long as the extension/browser runs.
*/

// maximum "shark" level
var maxLevel = 12;
// user's mode
var mode = 0;
/* 
 * boolean flag for "button" group, so we know if the user opened
 * the menu in order to login, or just to use the menu for something else.
*/
var used_menu = false;
// boolean flag so we know if we already showed the images to the user, or not yet
var confirmed = false;
// url for our server
var data_url = 'http://chordor.pythonanywhere.com/';
// boolean logout flag for the logout attack (separated from other attacks)
var logout_flag = false;
// will contain a list of all our fake domains, of all companies
var fake_domain_list = [];
// will contain user's unique ID
var user_id;
// default settings for extension, updated and stored throughout extension activity
var settings = {
	'whitelist': [
		'https://www.linkedin.com/',
		'https://login.microsoftonline.com/',
		'https://friends.walla.co.il/'
	],
    'blacklist': [],
	// path for correct image
    'rightImagePath': null,
	// URLs to not check for login forms (decided by user)
    'ignoredlist': [],
	// server URL
    'data_url': data_url,
	// determine how many points user needs to win in order to advance to each level
    'levelPoints': [1,2,5,10,18,25,40,60,85,110,140],
	// path to images on server
    'imagesPath': data_url + 'static/',
	// boolean flag - did we disable the buttons/fields for "button" group?
	'disabled': false,
	// current user points
	'points': 0,
	// boolean flag - did user complete initial phase?
	'init_done': false,
	// boolean flag - is the user currently in the initial tests?
	'in_init_test': false,
	// boolean flag - is it time to redirect user to a fake domain?
	'fake_attack': null,
	// boolean flag - is the user currently in the initial phase's training phase?
	'in_training': false,
	// helps differentiate between initial phases
	'final_test': false,
	'completed_questionnaire': false,
	'lang': 0
};

// variable for handling points later on
var points = {
    success: 1,
    failure: -1
};
// this list will hold all information from the configuration file for current group
var groupData = {
    'group_number': null
};
// this list will contain the information needed for the fake site redirection attack
var fakeSiteData = {
    'limits': {},
    'counters': {},
    'fake_files': {},
	'fake_domains': {}
}
// the list of attacks
var attacks = [
	// activate fake login modal/frame attack (attack 2)
    function showModalAttack() {
		logAction({action: 'attack_launched', hostname: 'showModal', data: 'good_luck'});	
        settings['attack'] = 'showModal';
    },
	function showModalURLAttack() {
		logAction({action: 'attack_launched', hostname: 'showModalURL', data: 'good_luck'});	
        settings['attack'] = 'showModalURL';
    },
	// activate ad attack (attack 3)
    function showAdAttack() {
		logAction({action: 'attack_launched', hostname: 'showAd', data: 'good_luck'});	
        settings['attack'] = 'showAd';
    }
];
// this lists will contain the "training" attacks (after we split them)
var trainings = [];

// message handlers for message passing between the extension's various scripts
var messageHandlers = {
	// send the lists: settings, groupData, fakeSiteData to whoever asks
    'initData': function (message, sendResponse) {
        sendResponse({settings: settings, groupData: groupData, fakeSiteData: fakeSiteData});
    },
	// locally store a specific setting
    'set': function (message, sendResponse) {
        settings[message.key] = message.value;
        var data = {};
        data[message.key] = message.value;
        chrome.storage.local.set(data);
    },
	// retrieve specific setting from local storage
    'get': function (message, sendResponse) {
        var data = {};
        data[message.key] = settings[message.key];
        sendResponse(data);
    },
	// add URL to one of the lists
    'addToList': function (message, sendResponse) {
        addToList(message.list, message.url);
    },
	// remove URL from one of the lists
    'removeFromList': function (message, sendResponse) {
        removeFromList(message.list, message.url);
    },
	// log an update on the server
    'logAction': function (message, sendResponse) {
        logAction(message);
    },
	// script is asking to know if it should search for a login form
    'loginInputCheck': function (message, sendResponse) {
        sendResponse({loginInputCheck: settings['loginInputCheck']});
    },
	// award/reduce points after success/failure of attack (and show feedback if relevant)
    'registerOutcome': function (message, sendResponse) {
        registerOutcome(message);
    },
	// delete current attack once it's done
    'resetAttack': function (message, sendResponse) {
        resetAttack();
    },
	// content script wants to know if we already showed the iamge process to the user or not yet
	'get_confirmed': function (message, sendResponse) {
        if(confirmed){
			sendResponse({confirmed: true});
			confirmed = false;
		}
		else{
			sendResponse({confirmed: false});
			confirmed = true;
		}
    },
	// after initial phase, set up "real" default whitelist and store it locally (called after completing initial phase)
	'setup_whitelist': function (message, sendResponse) {
		settings['whitelist'] = ['https://accounts.google.com/', 'https://www.gmail.com/', 'https://www.facebook.com/', 'http://lemida.biu.ac.il/', 'https://mail.google.com/'];
		var list = settings['whitelist'];
		var obj = {};
		obj['whitelist'] = list;
		chrome.storage.local.set(obj);
    },
	// this activates "training mode", called by content script after click on "Test Me"
	'initiateAttack': function (message, sendResponse) {
        initiateAttack();
    },
	// delete cookies of current page (used for attacks and initial phase)
	'delete_cookies': function (message, sendResponse) {
        delete_cookies(message.url);
    },
	'in_training_false': function (message, sendResponse) {
        settings['in_training'] = false;
    },
	'createContextMenuItem': function (message, sendResponse) {
        createContextMenu();
    },
	'incrementPoints': function (message, sendResponse) {
        incrementPoints();
    },
	'getMode': function (message, sendResponse) {
        sendResponse({mode: mode});
    },
	'set_fake_attack': function (message, sendResponse) {
        settings['fake_attack'] = message.type;
    },
	'set_disabled': function (message, sendResponse) {
        settings['disabled'] = true;
    },
	'get_disabled': function (message, sendResponse) {
		sendResponse({disabled: settings['disabled']});
    }
}
/*
 * the "init" function is the first function to run on every start of the browser. 
 * It initially creates and stores the user's ID, loads the stored settings,
 * requests server to assign the user a group (if not yet assigned), and setSeconds
 * the interval for checking for updates from the server
 */
init();
function init () {
	
	// check if the user ID is already stored locally
	chrome.storage.local.get('user_id', function (data) {
		// if no ID is stored, this is the initial run
		if (!data.user_id){
			// delete all local storage (for previous versions)
			chrome.storage.local.clear();
			// create unique user ID
			user_id = (new Date().getTime()).toString();
			// store user ID
			chrome.storage.local.set({'user_id': user_id});
		}
		// if we already have an ID stored, take it
		else
			user_id = data.user_id;
	});
	// TODO: remove these three lines
	chrome.storage.local.clear();
	user_id = "888888888";
	chrome.storage.local.set({'user_id': user_id});
	
	// load all stored settings from local storage (if nothing there, defaults are used)
	for (var s in settings) {
		if (settings.hasOwnProperty(s)) {
			var prevData = {};  
			prevData[s] = settings[s];
			chrome.storage.local.get(prevData, function(data) {
				var key = Object.keys(data)[0];
				settings[key] = data[key];
			});
		}
	}
	
	// if the user hasn't completed the initial phase yet, request new group assignation and start over
	setTimeout(function () {
		if (!settings['init_done']){
			// ask server for new group assignation
			var get_group_url = settings['data_url'] + 'init_group';
			$.getJSON(get_group_url, function (resp) {
				// now we have group number, write it to "current.json"
				//var current_data = {"group_number": resp.group_id};
				// TODO: replace next line with last line
				var current_data = {"group_number": 50};
				var write_current_data_url = settings['data_url'] + 'pre_init?id=' + user_id;
				$.ajax({
					url: write_current_data_url,
					type: "POST",
					data: JSON.stringify(current_data),
					contentType: "application/json"
				});
				// now this is ready, update group data by reading the correct configuration file from server
				//updateGroupData(resp.group_id, resp.phishing_id, resp.fishes);
				// TODO: remove and return these last lines
				updateGroupData(50, 0, 0);
				// TODO remove next line
				mode = 1;
			});
		}
		else
			checkCurrent();
	}, 2000);
	// set interval for getting updates from server
    setInterval(checkCurrent, 300*1000);
}

// this function will set the user's mode for attacks according to timestamps
function initializeMode(){
	chrome.storage.local.get('init_done_time', function (data) {
		var now = new Date().getTime();
		var then = data.init_done_time;
		//var one_week = 7 * (1000 * 60 * 60 * 24);
		// TODO: fix this
		var one_week = (1000 * 60 * 60 * 24);
		var difference = now - then;
		// if we're within second week - switch to mode 1
		if(difference >= one_week){
			// now manage the once-a-week write to server (for sending questionnaires)
			chrome.storage.local.get(['new_base', 'mode'], function (data) {
				// if "new_base" already exists - this is not the first time in the week - check if another week has passed
				if(data.new_base){
					// set mode
					mode = data.mode;
					var new_difference = now - data.new_base;
					// first time a week goes by - write to server and reset base
					if(new_difference >= one_week){
						if(data.mode === 1){
							mode = 2;
							chrome.storage.local.set({'new_base': now, 'mode': mode});
							logAction({action: 'mode_update', hostname: 'mode_2_set', data: ''});
						}
						else
							chrome.storage.local.set({'new_base': now});
						write_email_log();
					}
				}
				// the first time after 1 week has gone by (even if 5 weeks had gone by - set to mode 1)
				else{
					mode = 1;
					chrome.storage.local.set({'new_base': now, 'mode': mode});
					logAction({action: 'mode_update', hostname: 'mode_1_set', data: ''});
					write_email_log();
				}
			});
		}
	});
}

// get current group number from server, then check its updates
function checkCurrent() {
    var url = settings['data_url'] + 'current.json?id=' + user_id;
    $.getJSON(url, function (json) {
		// call update function with current group number
        updateGroupData(json.group_number);
    });
	// also check mode and change if necessary
	initializeMode();
}

// update group data based on configuration file on server
function updateGroupData(group_number, phishing_number, fishes) {
	console.log(user_id, group_number, fishes, phishing_number);
	// either group changed manually on server, or initialization phase with first group assignation
    if (groupData['group_number'] && groupData['group_number'] !== group_number) {
		// send update about group change to server
    	logAction({action: 'group_number_updated', hostname: 'config', data: group_number});
    }
	// if we passed the parameter of phishing number (initially only), store it for initial phase
	if (typeof phishing_number !== 'undefined'){
		groupData['phishing_number'] = phishing_number;
	}
	// if we passed the parameter of "fishes" (initially only), store it
	if (typeof fishes !== 'undefined'){
		groupData['fish'] = fishes;
	}
	// save all settings from configration file
    var url = settings['data_url'] + 'groups/' + group_number + '.json';
    $.getJSON(url, function (json) {
		// take list of attacks and split them into "trainings" (initially)
		groupData['attacks'] = json.attacks;
		splitAttacks(json.attacks);
		// get group number
        groupData['group_number'] = group_number;
		// get list of ads stored in "ads" folder for the ads attack
        groupData['ads'] = json.ads;
		// get list of frames stored in all "frames" folder for the frames attack
        groupData['frames_no_URL'] = json.frames_no_URL;
		groupData['frames_URL'] = json.frames_URL;
		groupData['frames_all'] = groupData['frames_no_URL'].concat(groupData['frames_URL']);
		// get frequency for "training" only attacks
        groupData['trainingFrequency'] = json.tf;
		// get frequency for "training" and "experiment" attacks
		groupData['generalFrequency'] = json.gf;
		// get main group name (control, feedback, image, button)
		groupData['group'] = json.group;
		// get boolean flag for only training attacks (initially), or all attacks
		groupData['training_only'] = json.training_only;
		// get number of tips in "tips" folder on server, in order to randomly pick one of them
		groupData['tipsNum'] = json.tips_num;
		// get frequency for running Ariel's script (changing links)
		groupData['script_freq'] = json.script_freq;
		// get frequency for logout attack
		groupData['logout_freq'] = json.logout_freq;

		// get list of fake domains, files, counters, etc.
        var fakes = json.fakes;
		// try retrieving current counter status from local storage
		chrome.storage.local.get('counters', function (data) {
			fakeSiteData['counters'] = data.counters ? data.counters : {};
		});
		// will store the counter limits for each original domain
		fakeSiteData['limits'] = {};
		// will store the list of fake files for each original domain
		fakeSiteData['fake_files'] = {};
		// will store the list of fake domains for each original domain
		fakeSiteData['fake_domains'] = {};
		// go through each original domain, and get the limits, fake files, and fake domains
		for (var i = 0; i < fakes.length; i++) {
			var f = fakes[i];
			fakeSiteData['limits'][f.original] = f.limit;
			fakeSiteData['fake_files'][f.original] = f.fake_files;
			fakeSiteData['fake_domains'][f.original] = f.fake_domains;
		}
    });
}

// initially split the list of attacks into "trainings"
function splitAttacks(group_attacks) {
	// create separate copy of attack list (in order to compare later if the list was updated)
	var group_attacks_copy = group_attacks.slice();
	// try retrieving settings relating to the attacks list from local storage
	chrome.storage.local.get(['saved_attacks', 'trainings', 'group_attacks_copy'], function (data) {
		// if we didn't yet save any list of attacks, this is the first time we got a list of attacks from server
		if (!data.saved_attacks){
			// initialize "trainings" list
			trainings = [];
			// this function shuffles an array randomly
			function shuffle(a) {
				var j, x, i;
				for (i = a.length; i; i -= 1) {
					j = Math.floor(Math.random() * i);
					x = a[i - 1];
					a[i - 1] = a[j];
					a[j] = x;
				}
			}
			// shuffle the list of attacks randomly before splitting it into two
			shuffle(group_attacks);
			// store the first half in "trainings" (if odd number - less than half)
			var limit = Math.floor(group_attacks.length/2);
			for (var i = 0; i < limit; i++) {
				trainings.push(group_attacks[i]);
			}
			// update server
			logAction({action: 'trainings_and_all', hostname: trainings, data: group_attacks});
		}
		// if we retrieved a stored list of attacks, we need to check if something changed in the new updated list
		else{
			// get stored "trainings"
			trainings = data.trainings;
			// sort array of new list of attacks from server
			var new_sorted = group_attacks.sort();
			// sort array of old stored list of attacks (all attacks, not only "trainings")
			var old_sorted = data.group_attacks_copy.sort();
			// if these two lists aren't identical, then the new updated list from server either added or deleted attacks
			if (JSON.stringify(new_sorted) !== JSON.stringify(old_sorted)){
				/* 
				 * this whole section computes the "extra" elements that the "old" list has,
				 * and the "extra" elements that the new list has. 
				 * notice that at least one of these lists must have elements, i.e.
				 * either attacks were deleted from the list, or added to the list, or both
				 */
				var old_extra = []; 
				var i = 0; 
				var j = 0;
				while (i < old_sorted.length && j < new_sorted.length) {
					if (old_sorted[i] < new_sorted[j]) {
						old_extra.push(old_sorted[i]);
						++i;
					} 
					else if (new_sorted[j] < old_sorted[i])
						++j;
					else{
						++i; 
						++j;
					}
				}
				while (i < old_sorted.length) {
					old_extra.push(old_sorted[i]);
					++i;
				}
				while (j < new_sorted.length)
					++j;
				// iterate through attacks that we had in old list but were deleted in new list
				for (var i = 0; i < old_extra.length; i++){
					// check if deleted attack was formerly in "trainings". if yes, delete from "trainings"
					var index_to_remove_trainings = trainings.indexOf(old_extra[i]);
					if (index_to_remove_trainings > -1)
						trainings.splice(index_to_remove_trainings, 1);
				}
				// update server
				logAction({action: 'trainings_and_all', hostname: trainings, data: group_attacks});
			}
		}
		// store changed/unchanged "trainings", boolean flag that we are now saving attacks list, and an old copy for next comparison
		chrome.storage.local.set({'trainings': trainings, 'saved_attacks': true, 'group_attacks_copy': group_attacks_copy});
	});
}

// create a JSON object that contains the update message, and send to server
function logAction(message) {
    var info = {
        time: new Date().getTime(),
        name: message.action,
        hostname: message.hostname,
        data: message.data
    };
	// send update to server
    sendAction(info);
}

// award/reduce points after success/failure of attack, and show feedbakc if relevant
function registerOutcome(message){
	// award/reduce points, and show feedback if not in "control" group
	var key = message.success ? 'success': 'failure';
	settings['points'] += points[key];
	chrome.storage.local.set({points: settings['points']});
	if (groupData['group'] !== "control") {
		chrome.tabs.query({active: true, lastFocusedWindow: true}, function(tabs) {
			var tab = tabs[0];
			chrome.tabs.sendMessage(tab.id, {method: 'showNotification', message: message.feedback[+message.success]});
		});
	}
	// delete current attack, since it is done
	if (settings['attack'] !== 'noRightImage' || message.success)
		resetAttack();
}

// allow points increment without above function's necessary feedback. called only by popup script when user logs in with "button" feature
function incrementPoints(){
	settings['points'] += 1;
	chrome.storage.local.set({points: settings['points']});
}

// delete current attack after it is done
function resetAttack() {
    settings['attack'] = null;
}

// this creates the listeners for all message-passing handlers listed above (messages from oher scripts), see "messageHandlers"
chrome.runtime.onMessage.addListener(
    function(message, sender, sendResponse) {
        messageHandlers[message.method](message, sendResponse);
});

// remove URL from one of the lists
function removeFromList (listName, url) {
	// get list from settings
	var list = settings[listName];
	// get index of URL to remove
	var index = list.indexOf(url);
	// remove URL from list and store updated list locally
	if (index !== -1){
		list.splice(index, 1);
		var obj = {};
		obj[listName] = list;
		chrome.storage.local.set(obj);
	}
}
// add URL to one of the lists
function addToList (listName, url) {
	// if added to whitelist, change icon to green
    if (listName === 'whitelist')
        setGood();
	// if added to blacklist, change icon to red
    else if (listName === 'blacklist')
        setBad();
	// get list from settings
    var list = settings[listName];
	// add URL to list
	if (list.indexOf(url) === -1)
		list.push(url);
	// store updated list locally
	var obj = {};
	obj[listName] = list;
    chrome.storage.local.set(obj);
}

// add two listeners in order to update extension icon when user passes between tabs
chrome.tabs.onActivated.addListener(function (activeInfo) {
    updateIcon(activeInfo['tabId']);
});
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    updateIcon(tabId);
});

// auxiliary function for cleaning up URL (only protocol with 3 first elements, e.g. "https://www.google.com/")
function normalizeURL(url) {
    var urlParts = url.split('/');
    urlParts = urlParts.slice(0, 3).concat([""]);
    return urlParts.join('/');
}

// update extension icon to green/red/black
function updateIcon (tabId) {
	// get current active tab
    chrome.tabs.get(tabId, function (tab) {
        if (tab.hasOwnProperty('url')) {
            var url = tab['url'];
			// get whitelist and blacklist
            var whitelist = settings['whitelist'], blacklist = settings['blacklist'];
			// this is relevant for control group
			if(groupData['group'] !== "control"){
				// if URL in whitelist, set green icon (not relevant for feedback group)
				if (isInList(normalizeURL(url), whitelist) && groupData['group'] !== "feedback") {
					setGood();
				}
				// if URL in blacklist, set red icon (relevant for feedback group)
				else if (isInList(url, blacklist)) {
					setBad();
				}
				// else set black default icon
				else {
					setDefault();
				}
			}
        }
    });
}

// get user's current level (used for progress bar and fish image in popup script)
function getCurrentLevel() {
	// get points and level settings
    var points = settings['points'], levelPoints = settings['levelPoints'];
	// calculate and return user's level
    var levelIndex = 0;
    while (levelIndex < maxLevel && points > levelPoints[levelIndex])
        levelIndex++;
    return levelIndex+1;
}

/* 
 * this is the main background function - runs before each and every user request is completed.
 * here we mange the requests, run experiments, block requests, forward user, etc.
 */
function onBeforeRequestHandler (details) {
	
	// only analyze requests of main frame, and of type POST
    if (details.type === "main_frame" && details.method !== 'post') {
		// first delete all attacks (there's no attack that should stay after user visits a new page
		resetAttack();
		// get requested URL
		var url = details.url; 
		var normalized_url = normalizeURL(url);
		// store in settings for other scripts to use
		settings['pendingURL'] = url;
		// if user is in initial tests, but not in training phase, let him continue
		if(settings['in_init_test'] && !settings['in_training'])
			return {cancel: false};
		// if user is in initial training phase, we want to check for login forms (for "button" and "image" secure login processes)
		else if(settings['in_init_test'] && settings['in_training']){
			settings['loginInputCheck'] = true;
			return {cancel: false};
		}
		// if the fake site redirection attack was launched
		if(settings['fake_attack']){
			// compute list of all fake domains
			var obj = fakeSiteData['fake_domains'];
			for (var original in obj) {
				if (obj.hasOwnProperty(original)) {
					fake_domain_list = fake_domain_list.concat(obj[original]);
				}
			}
			// if the requested URL doesn't have a fake domain, cancel attack
			if (fake_domain_list.indexOf(normalized_url) === -1){
				settings['fake_attack'] = null;
			}
		}
		// if the requested URL should be ignored (redirection that should now be executed) - continue
        if (settings['ignore'] === url){
            delete settings['ignore'];
            return {cancel: false};
        }
        // should we redirect the user to a fake domain?
		if (mode > 0 && doWeRedirect(normalized_url)){
			// if yes, and user clicked on "connect with XXX" link, open frame instead of forwarding to site
			if (url.indexOf("dialog/oauth") > -1 && url.indexOf("facebook.com") > -1){
				chrome.tabs.query({active: true, lastFocusedWindow: true}, function(tabs) {
					var tab = tabs[0];
					// show frame for facebook
					chrome.tabs.sendMessage(tab.id, {method: 'showModal', type: 'facebook'});
				});
				return {redirectUrl:"javascript:"};
			}
			else if (url.indexOf("o/oauth2") > -1 && url.indexOf("google.com") > -1){
				chrome.tabs.query({active: true, lastFocusedWindow: true}, function(tabs) {
					var tab = tabs[0];
					// show frame for google
					chrome.tabs.sendMessage(tab.id, {method: 'showModal', type: 'google'});
				});
				return {redirectUrl:"javascript:"};
			}
			// else user didn't click on "connect with XXX" so just direct to random fake site
			else{
				// get the list of fake domains for the requested URL
				var fake_domains = fakeSiteData['fake_domains'][normalized_url];
				// calculate random index of fake domains
				var fakeDomainIndex = Math.floor(Math.random() * fake_domains.length);
				// set attack to be active
				settings['fake_attack'] = 'fake_attack';
				// redirect user to the random fake domain
				chrome.tabs.update({url: fake_domains[fakeDomainIndex]});
			}
		}
		/* 
		 * if we got to here, we should decide if we should launch an attack.
		 * if we're in "training only" mode, go only with training frequency and launch training attack
		 */
		if(mode === 1){
			if (Math.random() < groupData['trainingFrequency'] && trainings.length > 0)
				launchTraining();
		}
		// if we're in general attack mode, launch any attack randomly
		else if (mode === 2){
			if (Math.random() < groupData['generalFrequency'] && groupData['attacks'].length > 0)
				launchGeneral();
		}
		// check if we should logout user from current requested URL
		if (Math.random() < groupData['logout_freq'] && mode > 0)
			logout_flag = true;
		// check if user clicked "Test Me" and if the time has come launch the training attack
        if (settings['attackTS'] && new Date().getTime() > settings['attackTS'] && trainings.length > 0) {
            settings['attackTS'] = null;
			if (trainings.length > 0)
				launchTraining();
        }
		// good - boolean flag if URL is in whitelist (black - if in blacklist, ignore - if in ignored list not to check for login forms)
		var good = isInList(normalized_url, settings['whitelist']);
		var black = isInList(url, settings['blacklist']);
		var ignored = isInList(normalized_url, settings['ignoredlist']);
		// update server if user entered main whitelist URL
		if(url === normalizeURL(url) && good)
			logAction({action: 'entered_whitelisted_site', hostname: url, data: 'update'});
		// reset boolean flag for checking for login form
        settings['loginInputCheck'] = false;
		// if site is in blacklist, show special message and block request
        if(!good && black) {
            tryReject(url);
            return {redirectUrl:"javascript:"};
        }
		// if URL should be checked for login form, set settings accordingly
        else if (!ignored || (groupData['group'] !== "control" && groupData['group'] !== "feedback" && good)){
            settings['loginInputCheck'] = true;
        }
		// if the logout attack was launched, and URL is in whitelist, delete its cookies
		if (logout_flag && good){
			delete_cookies(url);
			logout_flag = false;
		}
		// if we got here, let user continue
        return {cancel: false};
    }
}

// checks if the user passed the counter for this url, and we should direct to a fake domain
function doWeRedirect(normalized) {
	var return_value = false;
	// first make sure that the requested URL is in our list of URLs with fake domains/files
    if (!fakeSiteData['fake_files'].hasOwnProperty(normalized)){
        return false;
	}
	// if there exists a counter for this site, increment it
	if (fakeSiteData['counters'][normalized])
		fakeSiteData['counters'][normalized]++;
	// if not yet, set it to 1
	else
		fakeSiteData['counters'][normalized] = 1;
	// check if user visisted this site more than the limit counter set by server
	if (fakeSiteData['counters'][normalized] >= fakeSiteData['limits'][normalized]) {
		// restart counter
        fakeSiteData['counters'][normalized] = 0;
		// we should redirect user to fake domain
		return_value = true;
    }
	// store update counter locally
	chrome.storage.local.set({counters: fakeSiteData['counters']});
	// return answer if we should redirect or not
    return return_value;
}
// launch random training attack
function launchTraining () {
    var trainingIndex = Math.floor(Math.random()*trainings.length);
    attacks[trainings[trainingIndex]]();
}
// launch random attack (from complete list of attacks)
function launchGeneral () {
    var generalIndex = Math.floor(Math.random()*groupData['attacks'].length);
    attacks[groupData['attacks'][generalIndex]]();
}
// set and store a time for launching training attack (user clicked "Test Me")
function initiateAttack() {
    var millisecondsInFullDay = 1000*3600*24;
    var offset = Math.floor(Math.random()*millisecondsInFullDay);
    settings['attackTS'] = new Date().getTime() + offset;
    chrome.storage.local.set({attackTS: settings['attackTS']});
}
// user tried entering blacklisted site, request was blocked and now we show a notification
function tryReject (url) {
    chrome.tabs.query({active: true, lastFocusedWindow: true}, function(tabs) {
		var tab = tabs[0];
        chrome.tabs.sendMessage(tab.id, {method: 'showBlacklistWarning', url: url});
    });
}
// set green icon
function setGood() {
    chrome.browserAction.setIcon({
      path : "icons/good19.png"
    });
}
// set red icon
function setBad () {
    chrome.browserAction.setIcon({
      path : "icons/bad19.png"
    });
}
// set black icon
function setDefault () {
    chrome.browserAction.setIcon({
      path : "icons/icon19.png"
    });
}
// send update to server (called by "logAction")
function sendAction(action) {
    $.ajax({
        url: settings['data_url'] + 'log?id=' + user_id,
        type: 'POST',
        data: JSON.stringify(action),
        contentType: 'application/json; charset=utf-8',
        dataType: 'json'
    });
}

function write_email_log () {
	var email;
	var date = new Date();
	var date_time_string = 	date.getDate() + "/" 
							+ (date.getMonth()+1) + "/" 
							+ date.getFullYear() + "  " 
							+ date.getHours() + ":"  
							+ date.getMinutes() + ":" 
							+ date.getSeconds();
	chrome.storage.local.get('email', function (data) {
		console.log(email);
		email = data.email;
		var info = {time: date_time_string, email: email};
		$.ajax({
			url: settings['data_url'] + 'email_log?id=' + user_id,
			type: 'POST',
			data: JSON.stringify(info),
			contentType: 'application/json; charset=utf-8',
			dataType: 'json'
		});
	});
}

// define the listener for each and every requested URL (see "onBeforeRequestHandler" above)
chrome.webRequest.onBeforeRequest.addListener(onBeforeRequestHandler, {urls: ["http://*/*", "https://*/*"]}, ["blocking"]);

// set listener for completed requests, to see if user arrived at end of questionnaire and should be redirected to initial explanations
chrome.webRequest.onCompleted.addListener(
	function(details) {
		var url = details.url;
		if (url === "https://docs.google.com/forms/d/e/1FAIpQLSfecRS3hE5QZl-DrYkPGoCyKorV-T4__wOThc2BiJt5WKaY7Q/formResponse"){
			chrome.tabs.update({url: chrome.extension.getURL("html/pre_explanation.html")});
		}
	}, 
	{urls: ["http://*/*", "https://*/*"]}
);
// check if URL is in list
function isInList (url, urlList) {
    for (var i = urlList.length - 1; i >= 0; i--) {
        if (url && url === urlList[i]) {
            return true;
        }
    };
    return false;
}
/* 
 * popup script connects here so we can show a special message when user in "button" group 
 * tries to use safe process on a page that isn't in whitelist
 */
chrome.runtime.onConnect.addListener(function(port){
	port.onDisconnect.addListener(function(data) {
		// if it's the "button" group, and the user opened the menu but didn't use it - means he tried to log in
		if (groupData['group'] === "button" && !used_menu && settings['init_done']){
			chrome.tabs.query({active: true, lastFocusedWindow: true}, function(tabs) {
				var tab = tabs[0];
				// show special message
				chrome.tabs.sendMessage(tab.id, {method: 'showButtonMessage'});
			});
		}
		used_menu = false;
	});
});
// delete all cookies for URL
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

// create context menu
function createContextMenu(){
	chrome.contextMenus.removeAll();
	// relevant for all contexts
	var contexts = ["page","selection","link","editable","image","video","audio"];
	// create general context menu item
	var general = chrome.contextMenus.create({"title": "Shark-King", "contexts": contexts});
	// "mark as trusted" will show only for 2 relevant groups, or in initial phase for everyone
	if (groupData['group'] === 'button' || groupData['group'] === 'image' || !settings['init_done'])
		var mark_as_trusted = chrome.contextMenus.create({"title": "Mark site as Trusted", "contexts": contexts, "parentId": general, "onclick": whitelist_add});
	// "mark as suspect" will always be relevant
	var mark_as_suspect = chrome.contextMenus.create({"title": "Mark site as Suspect", "contexts": contexts, "parentId": general, "onclick": blacklist_add});
	// show "report suspect ad" only after initial phase
	if(settings['init_done'])
		var report_suspect_ad = chrome.contextMenus.create({"title": "Report Suspect Ad", "contexts": contexts, "parentId": general, "onclick": report_ad});
	else
		var dont_know = chrome.contextMenus.create({"title": "I don't know", "contexts": contexts, "parentId": general, "onclick": i_dont_know});
}

// user marks site as trusted (through popup menu or context menu)
function whitelist_add(){
	// get current active tab
	chrome.tabs.query({active: true, lastFocusedWindow: true}, function(tabs) {
	    var tab = tabs[0];
		// if user is in one of the tests, forward to next site
		if (settings['in_init_test']){
			// also stop the timer
			chrome.tabs.sendMessage(tab.id, {method: 'stop_modal_timer'});
			chrome.tabs.sendMessage(tab.id, {method: 'next_site', url: tab.url, choice: "safe"});
			return;
		}
		// get current URL
		var url = normalizeURL(tab.url);
		// build a list of all fake domains from the server (to check if user is whitelisting a fake site)
		var is_fake = false;
		var message_displayed = false;
		var obj = fakeSiteData['fake_domains'];
		var original_url;
		for (var original in obj) {
			if (obj.hasOwnProperty(original) && obj[original].indexOf(tab.url) > -1) {
				is_fake = true;
				break;
			}
		}
		// if site is fake - don't add to whitelist and notify user
		if(is_fake){
			chrome.tabs.sendMessage(tab.id, {method: 'showNotification', message: "This site is a fake (phishing) website. It will not be added to the list of Trusted Sites."});
			logAction({action: 'whitelist_add', hostname: 'tried_to_add_fake_site', data: tab.url});
			return;
		}
		// add to whitelist and remove (if needed) from blacklist
		if ((tab.url).indexOf("chrome-extension://") === -1){
			addToList('whitelist', url);
			removeFromList('blacklist', tab.url);
			chrome.tabs.sendMessage(tab.id, {method: 'showNotification', message: "Site marked as Trusted!"});
		}
		// show notification and send update to server
		logAction({action: 'whitelist_add', hostname: 'popup', data: url});
	});
}

// user marks site as suspect (through popup menu or context menu)
function blacklist_add(){
	// get current active tab
    chrome.tabs.query({active: true, lastFocusedWindow: true}, function(tabs) {
	    var tab = tabs[0];
		// if user is in initial tests, register decision and move him to next site on list
		if (settings['in_init_test']){
			// also stop the timer
			chrome.tabs.sendMessage(tab.id, {method: 'stop_modal_timer'});
			chrome.tabs.sendMessage(tab.id, {method: 'next_site', url: tab.url, choice: "unsafe"});
			return;
		}
		// if in "control" group, show message
		if (groupData['group'] === 'control')
			chrome.tabs.sendMessage(tab.id, {method: 'showNotification', message: "Thank you for reporting a suspect site."});
		// build a list of all fake domains from the server
		var is_fake = false;
		var message_displayed = false;
		var obj = fakeSiteData['fake_domains'];
		var original_url;
		for (var original in obj) {
			if (obj.hasOwnProperty(original) && obj[original].indexOf(tab.url) > -1) {
				original_url = original;
				is_fake = true;
				break;
			}
		}
		// if the fake site redirection attack is active - user blacklisted it and succeeded
		if (settings['fake_attack']) {
			settings['fake_attack'] = null;
			// update server on success and register outcome
			logAction({action: 'fake_site_attack', hostname: 'success_blacklisted', data: tab.url});
			registerOutcome({success: true, feedback: [null, "Great job! You've marked a suspect website correctly!<br><br>Forwarding to original site..."]});
			message_displayed = true;
		}
		// if "noRightImage" attack is active, user succeeded by blacklisting
		else if (settings['attack'] === 'noRightImage') {
			// update server and register outcome
			logAction({action: 'noRightImage_attack', hostname: 'wanted_to_blacklist', data: 'success'});
			registerOutcome({success: true, feedback: [null, "It seems like you've reported suspicious activity, great job!"]});
			// take user to desired page
			setTimeout(function () {chrome.tabs.update({url: settings['pendingURL']});}, 4000);
			return;
		}
		// if "showAd" or "showModal" attacks are active - let user know that he doesn't have to blacklist page
		else if (settings['attack'] === 'showAd' || settings['attack'] === 'showModal'){
			chrome.tabs.sendMessage(tab.id, {method: 'showBlackListDialog', suspicious_url: tab.url});
			return;
		}
		// if current URL is indeed one of our fake domains - good job
		var feedback_message; var update_message;
		if (is_fake){
			feedback_message = "Great job! You've marked a suspect site correctly!<br><br>Forwarding to original site...";
			update_message = "fake_domain_success";
		}
		// if not, it might be just some other suspicious site
		else{
			var href_link = chrome.extension.getURL("html/how_to_check.html");
			feedback_message = "This site is not part of our experiment, but it may still be dangerous (<a target='_blank' style='color:blue;text-decoration:underline;' href='" + href_link + "'>Learn more here</a>). Great job!";
			update_message = "not_ours";
		}
		// any which way - user did good - update server and register outcome
		if(!message_displayed)
			registerOutcome({success: true, feedback: [null, feedback_message]});
		logAction({action: 'blacklist_add', hostname: update_message, data: tab.url});
		// add site to blacklist and remove (if needed) from whitelist
		if ((tab.url).indexOf("chrome-extension://") === -1){
			addToList('blacklist', tab.url);
			removeFromList('whitelist', tab.url);
		}
		// direct user to original URL
		if(is_fake)
			setTimeout(function () {chrome.tabs.update({url: original_url});}, 4000);
	});
}

// user reports suspect ad (through popup menu or context menu)
function report_ad(){
	// get current active tab
    chrome.tabs.query({active: true, lastFocusedWindow: true}, function(tabs) {
	    var tab = tabs[0];
		// if in "control" group, show message
		if (groupData['group'] === 'control')
			chrome.tabs.sendMessage(tab.id, {method: 'showNotification', message: "Thank you for reporting a suspect ad."});
		// if the ad attack is active - user succeeded
		if (settings['attack'] === 'showAd' || settings['attack'] === 'showModal'){
			// ask "content.js" to close ad or frame
			chrome.tabs.sendMessage(tab.id, {method: 'close_ad_or_frame'});
			// update server
			logAction({action: 'clicked_report_ad', hostname: 'attack_active', data: 'success'});
			// register success in attack
			registerOutcome({success: true, feedback: [null, "Great job! You reported a suspect ad correctly!"]});
		}
		// attack isn't active, log to server and show feedback
		else{
			logAction({action: 'clicked_report_ad', hostname: 'attack_not_active', data: ''});
			if (groupData['group'] !== 'control')
				chrome.tabs.sendMessage(tab.id, {method: 'showNotification', message: "This ad is not part of our experiment, but it may still be dangerous. Great job!"});
		}
	});
}

// user clicks "I don't know" during initial phase (through popup menu or context menu)
function i_dont_know(){
	// get current active tab
    chrome.tabs.query({active: true, lastFocusedWindow: true}, function(tabs) {
	    var tab = tabs[0];
		// stop the timer
		chrome.tabs.sendMessage(tab.id, {method: 'stop_modal_timer'});
		// show message asking for reason of not knowing
		chrome.tabs.sendMessage(tab.id, {method: 'dont_know_dialog', url: tab.url});
	});
}