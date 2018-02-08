/* 
 * This script runs in the context of the menu popup
*/

// get access to "background.js"
var backgroundPage = chrome.extension.getBackgroundPage();
var settings = backgroundPage.settings;
var groupData = backgroundPage.groupData;
var URL_array = ["https://login-facebok.com/login.php/next=www.facebook.com.html", "https://banklogin.club/Hapoalim/bankhapoalim/Israel/ssl=1/", "https://www.torrentday.com/login.php?returnto=%2F", "https://pypal.website/signin/country.x=IL/locale.x=en_IL/", "https://www.adikastyle.com/customer/account/login/referer/aHR0cDovL3d3dy5hZGlrYXN0eWxlLmNvbS8,/", "http://www.bgu4u.co.il/members/login.aspx", "https://online.bankotsar.co.il/wps/portal/", "https://login-gamil.com/accounts.google.com/ServiceLogin=mail/service=mail//passive=true/rm=false/continue=https:/mail.google.com/mail/ss=1/scc=1/ltmpl=default/ltmplcache=2/#identifier", "https://bankleumi.club/uniquesig4e0824291ffbe1b42058d6558ed87217/uniquesig0/InternalSite/CustomUpdate/eBank_ULI_Login.asp/resource_id=6381D2C2DE2C4DAFB2F73FB654339DA7/login_type=2/", "https://www.pinterest.com/login/?referrer=home_page", "https://www.facebok-secure.com/login.php/facebook.com/", "https://passport.dx.com/?redirect=http%3A%2F%2Fwww.dx.com%2F%3Fredirect%3Dhttp%3A%2F%2Fwww.dx.com%2F", "https://login.yahoo.com/?.src=ym&.intl=us&.lang=en-US&.done=https%3a//mail.yahoo.com", "http://lemida.co/login/biu/", "https://www.eday.tech/ws/eBayISAPI.dll/SignIn/UsingSSL=1/pUserId=2/co_partnerId=2/siteid=0/ru=my.ebay.com/eBayISAPI.dll/FMyEbayBeta/26MyEbay/gbh/guest3D1/pageType=3984/", "https://www.wallashops.co/israel/shops/online/", "https://sso.compassmanager.com/login?service=https%3a%2f%2fomsfba.compassmanager.com%2ffmp", "https://banklogin.club/sc.mizrahi-tefahot.co.il/TFHLogin/index.html#/login", "http://lemida.biu.ac.il/login/index.php", "https://www.hot.net.il/heb/SelfService/Login/", "https://www.linkedin.com/start/join?trk=login_reg_redirect&session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fpeople%2Fpymk%2Fhub%3Fref%3Dglobal-nav%26trk%3Dnav_utilities_invites_header", "https://facebok-com.com/facebook/u3nmekvgn2/login.html", "https://login.microsoftonline.com/login.srf?wa=wsignin1.0&rpsnv=4&ct=1464676725&rver=6.7.6640.0&wp=MCMBI&wreply=https%3a%2f%2fportal.office.com%2flanding.aspx%3ftarget%3d%252fHome&lc=1033&id=501392&msafed=0&client-request-id=e1cf9c30-8fd4-4983-91ae-c94619d8e689", "https://secure-gamil.com/#identifier", "https://friends.walla.co.il/#/login", "https://walla-shops.com/Login/Online/"];


/* 
 * initialization function - displays relevant buttons for this user,
 * and sets the progress bar and fish image
 */
init();
function init() {
	chrome.tabs.query({active: true, lastFocusedWindow: true}, function(tabs) {
		// get last part and check if it's "questionnaire.html"
		var url = tabs[0].url;
		var parts = url.split("/");
		var last_part = parts[parts.length-1];
		// if user hasn't completed questionnaire, take him there
		if (!settings['init_done'] && !settings['completed_questionnaire'] && last_part !== "questionnaire.html"){
			chrome.tabs.create({url: chrome.extension.getURL("html/questionnaire.html")});
		}
		else if (!settings['init_done'] && settings['completed_questionnaire']){
			var URL_in_array = false;
			for(var i = 0; i<URL_array.length; i++){
				if(URL_array[i].indexOf(url) > -1 || (last_part === "post_explanation_eng.html" || last_part === "post_explanation_heb.html" || last_part === "pre_explanation.html" || last_part === "before_final_test.html")){
					URL_in_array = true;
					break;
				}
			}
			if(!URL_in_array)
				chrome.tabs.create({url: chrome.extension.getURL("html/pre_explanation.html")});
		}
		// get current active tab's URL
		var current_url = normalizeURL(url);
		// these are special cases for "image" and "control" groups - to 
		if(settings['final_test'] || settings['in_training']){
			// remove all irrelevant menu items
			$('#login').css('display','none');
			$('#settings').css('display','none');
			$('#test').css('display','none');
			$('#points').css('display','none');
			$('#tip').css('display','none');
			$('#report_ad').css('display','none');
			// maybe show safe message (for "button" group), "false" is for incrementing points
			safe_message_check(current_url, false);
		}
		// if we're done with the initial phase - show regular menu
		else if (settings['init_done']){
			// hide "don't know" menu item
			$('#dont_know').css('display','none');
			// if this group has "no fish" setting (i.e. 2), no need to calculate level and show fish
			console.log(groupData['fish']);
			if (groupData['fish'] === 2){
				$('#points').css('display','none');
			}
			else{
				// get current user's level and display it
				var level = backgroundPage.getCurrentLevel();
				var levelDiv = document.getElementById('level');
				levelDiv.textContent = level;
				// get progress bar element and update its value
				var progress = document.getElementsByTagName('progress')[0];
				progress.value = level;
				// get fish image for this level and display it
				var levelImage = document.getElementById('levelImage');
				levelImage.src = chrome.extension.getURL('images/levels/' + level + '.png');
				levelImage.style = "height: 40%; width: 40%;"
			}
			// for everyone except "image" and "button" - do not display "mark as trusted" and "settings" and "safe login" list
			if (groupData['group'] !== 'button' && groupData['group'] !== 'image') {
				console.log(groupData['group']);
				$('#login').css('display','none');
				$('#trusted').css('display','none');
				$('#settings').css('display','none');
				// for "control" group - no fish/points
				if (groupData['group'] === 'control')
					$('#points').css('display','none');
			}
			else{
				// update whitelist in "login safely"
				var parent = document.getElementById('menu_whitelist');
				var list = settings['whitelist'];
				// create each whitelist item link, but if user is already in whitelist, clicking the appropriate item will show special message
				for (var i = 0; i < list.length; i++) {
					if (list[i] !== current_url)
						parent.appendChild(makeItem(list[i], false));
					else
						parent.appendChild(makeItem(list[i], true));
				};
				// connect to "background.js" in order to check if user tried to use safe process to log in to a page that isn't in whitelist
				var port = chrome.runtime.connect();
			}
			// maybe show safe message (for "button" group), "true" is for incrementing points
			safe_message_check(current_url, true);
		}
		// if user didn't start training or final test, he's in the first part of first 10 links
		else{
			// remove all irrelevant menu items
			$('#login').css('display','none');
			$('#settings').css('display','none');
			$('#test').css('display','none');
			$('#points').css('display','none');
			$('#tip').css('display','none');
			$('#report_ad').css('display','none');
		}
	});
}

function safe_message_check(normalized_url, increment_points){
	// if current URL is in whitelist, and "button" group, and buttons are disabled - re-enable them and show safe login message
	if (settings['whitelist'].indexOf(normalized_url) !== -1 && groupData['group'] === 'button' && settings['disabled']){
		// re-enable site by closing overlay
		chrome.tabs.query({active: true, lastFocusedWindow: true}, function(tabs) {chrome.tabs.sendMessage(tabs[0].id, {method: 'close_overlay'});});
		// update "background.js" that we re-enabled buttons
		backgroundPage.settings['disabled'] = false;
		settings['disabled'] = false;
		// show safe message with current URL
		$("#site").text(normalized_url);
		$('#safe_message').show();
		// update server that user used secure process
		chrome.runtime.sendMessage({method: 'logAction', action: 'button_protection', hostname: 'enabled_buttons', data: 'success'});
		// update user's points if relevant
		if (increment_points)
			backgroundPage.incrementPoints();
	}
}

// creates whitelist to display in menu
function makeItem (url, special) {
	// we want to display "clean" URLs
	var item = document.createElement('li');
	var a = document.createElement('a');
	a.href = url;
	// if whitelist item is one of below - show nicer names
	if (url === 'https://accounts.google.com/')
		a.textContent = "Google";
	else if (url === 'https://www.gmail.com/')
		a.textContent = "Gmail";
	else if (url === 'https://www.facebook.com/')
		a.textContent = "Facebook";
	else if (url === 'http://lemida.biu.ac.il/')
		a.textContent = "Lemida";
	else
		a.textContent = url;
	item.appendChild(a);
	// set "onclick" function - simply transfer user to requested site, unless they're already there
	if (special)
		item.onclick = function(){
			chrome.tabs.query({active: true, lastFocusedWindow: true}, function(tabs) {
				backgroundPage.used_menu = true; 
				chrome.tabs.sendMessage(tabs[0].id, {method: 'showNotification', message: "You are currently visiting this trusted site!"}); 
				setTimeout(function () {window.close();}, 500);
			});
		};
	else
		item.onclick = function(){chrome.tabs.create({url: url});};
	return item;
}

// user clicked "Test Me" on menu
function testMeOnClickHandler() {
	backgroundPage.used_menu = true;
	// show the "test me" dialog for confirmation
	chrome.tabs.query({active: true, lastFocusedWindow: true}, function(tabs) {var tab = tabs[0]; chrome.tabs.sendMessage(tab.id, {method: 'showTestMe'});});
	setTimeout(function () {window.close();}, 500);
}

// user clicked "mark site as suspicious" on menu
function blacklistAddOnClickHandler() {
	backgroundPage.used_menu = true;
	// logic is in "background.js" not to duplicate code for context menu
	backgroundPage.blacklist_add();
	setTimeout(function () {window.close();}, 500);
}

// user clicked "mark as trusted site"
function whitelistAddOnClickHandler() {
	backgroundPage.used_menu = true;
	// logic is in "background.js" not to duplicate code for context menu
	backgroundPage.whitelist_add();
	setTimeout(function () {window.close();}, 500);
}

// user clicked "settings" on menu
function manageOnClickHandler() {
	backgroundPage.used_menu = true;
	// take user to settings page
	chrome.tabs.create({url: chrome.extension.getURL("html/manage.html")});
}

// user clicked "contact" on menu
function contactOnClickHandler() {
	backgroundPage.used_menu = true;
	// take user to contact form
	chrome.tabs.create({url: chrome.extension.getURL("html/contact.html")});
}

// user clicked "Show Tip" on menu
function tipOnClickHandler() {
	backgroundPage.used_menu = true;
	// get random tip
	var randomIndex = Math.floor(Math.random() * groupData['tipsNum']);
	var url = "https://chordor.pythonanywhere.com/tips/tip" + randomIndex + ".html";
	// get current active tab
	chrome.tabs.query({active: true, lastFocusedWindow: true}, function(tabs) {
	    var tab = tabs[0];
		// request "content.js" to show tip on page
		chrome.tabs.sendMessage(tab.id, {method: 'showTip', url: url});
	});
	// update server that user requested tip
	chrome.runtime.sendMessage({method: 'logAction', action: 'asked_for_tip', hostname: 'popup', data: url});
	setTimeout(function () {window.close();}, 500);
}

// auxiliary function for cleaning up URL (only protocol with 3 first elements, e.g. "https://www.google.com/")
function normalizeURL(url) {
    var urlParts = url.split('/');
    urlParts = urlParts.slice(0, 3).concat([""]);
    return urlParts.join('/');
}

// user clicked "don't know" during initial test
function dontKnowOnClickHandler() {
	backgroundPage.used_menu = true;
	// logic is in "background.js" not to duplicate code for context menu
	backgroundPage.i_dont_know();
	setTimeout(function () {window.close();}, 500);
}

// user clicked the "share" button
function shareOnClickHandler() {
	backgroundPage.used_menu = true;
	// update server
	chrome.runtime.sendMessage({method: 'logAction', action: 'share_button_clicked', hostname: '', data: ''});
	// get current active tab
	var share_url = 'https://mail.google.com/mail/?view=cm&fs=1&su=Shark-King Chrome Extension&body=Try this awesome extension! I am also using it.%0AIt provides another layer of protection against phishing attacks. %0A%0Ahttps://chrome.google.com/webstore/detail/shark-king/efkmjadmlkgicogfjooikiplflmkhhah&cc=shark.king.biu@gmail.com';
    chrome.tabs.create({url: share_url});
}

// user clicked the "hidden" item to change group number
function mainOnClickHandler() {
	backgroundPage.used_menu = true;
	var pwd = prompt("Please enter password:");
	if (pwd === "1111"){
		var group_number = prompt("New group number:");
		var parsed_group_number = ~~Number(group_number);
		if(String(parsed_group_number) === group_number && parsed_group_number >= 1 && parsed_group_number <= 7){
			var current_data = {"group_number": parsed_group_number};
			var write_current_data_url = settings['data_url'] + 'pre_init?id=' + backgroundPage.user_id;
			$.ajax({
				url: write_current_data_url,
				type: "POST",
				data: JSON.stringify(current_data),
				contentType: "application/json"
			});
			// now this is ready, update group data by reading the correct configuration file from server
			backgroundPage.updateGroupData(parsed_group_number);
			alert("Group number updated successfully!");
		}
		else if (group_number !== null)
			alert("You must enter an integer between 1-7.");
	}
	else if (pwd === "2222"){
		chrome.storage.local.clear();
		alert("Data deleted successfully!");
	}
	else
		alert("Wrong password.");
}

// user clicked "report ad" button
function reportAdAddOnClickHandler() {
	backgroundPage.used_menu = true;
	// logic is in "background.js" not to duplicate code for context menu
	backgroundPage.report_ad();
	setTimeout(function () {window.close();}, 500);
}

// set button listeners
document.getElementById("test").onclick = testMeOnClickHandler;
document.getElementById("suspicious").onclick = blacklistAddOnClickHandler;
document.getElementById("report_ad").onclick = reportAdAddOnClickHandler;
document.getElementById("trusted").onclick = whitelistAddOnClickHandler;
document.getElementById("settings").onclick = manageOnClickHandler;
document.getElementById("contact").onclick = contactOnClickHandler;
document.getElementById("tip").onclick = tipOnClickHandler;
document.getElementById("dont_know").onclick = dontKnowOnClickHandler;
document.getElementById("share").onclick = shareOnClickHandler;
document.getElementById("phishing").onclick = mainOnClickHandler;