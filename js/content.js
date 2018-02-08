/* 
 * This script is a content script. This means it runs in the 
 * context of each and every page, once it is loaded! 
 * Perfect for attacks that change page code.
 */

// define all necessary variables
var modal_shown = false;
var settings = null, groupData = null, fakeSiteData = null;
var failed = true;
var fake_domain_list = [];
var testCounter = 0;
var testCounterID;
var interval;
var modalInterval;
var closed_with_button = false;
var decoded = false;
var black_v = chrome.extension.getURL('icons/icon19.png');
var URL_array = ["https://login-facebok.com/login.php/next=www.facebook.com.html", "https://banklogin.club/Hapoalim/bankhapoalim/Israel/ssl=1/", "https://www.torrentday.com/login.php?returnto=%2F", "https://pypal.website/signin/country.x=IL/locale.x=en_IL/", "https://www.adikastyle.com/customer/account/login/referer/aHR0cDovL3d3dy5hZGlrYXN0eWxlLmNvbS8,/", "http://www.bgu4u.co.il/members/login.aspx", "https://online.bankotsar.co.il/wps/portal/", "https://login-gamil.com/accounts.google.com/ServiceLogin=mail/service=mail//passive=true/rm=false/continue=https:/mail.google.com/mail/ss=1/scc=1/ltmpl=default/ltmplcache=2/", "https://bankleumi.club/uniquesig4e0824291ffbe1b42058d6558ed87217/uniquesig0/InternalSite/CustomUpdate/eBank_ULI_Login.asp/resource_id=6381D2C2DE2C4DAFB2F73FB654339DA7/login_type=2/", "https://www.pinterest.com/login/?referrer=home_page", "https://www.facebok-secure.com/login.php/facebook.com/", "https://passport.dx.com/?redirect=http%3A%2F%2Fwww.dx.com%2F%3Fredirect%3Dhttp%3A%2F%2Fwww.dx.com%2F", "https://login.yahoo.com/?.src=ym&.intl=us&.lang=en-US&.done=https%3a//mail.yahoo.com", "http://lemida.co/login/biu/", "https://www.eday.tech/ws/eBayISAPI.dll/SignIn/UsingSSL=1/pUserId=2/co_partnerId=2/siteid=0/ru=my.ebay.com/eBayISAPI.dll/FMyEbayBeta/26MyEbay/gbh/guest3D1/pageType=3984/", "https://www.wallashops.co/israel/shops/online/", "https://sso.compassmanager.com/login?service=https%3a%2f%2fomsfba.compassmanager.com%2ffmp", "https://banklogin.club/sc.mizrahi-tefahot.co.il/TFHLogin/index.html#/login", "http://lemida.biu.ac.il/login/index.php", "https://www.hot.net.il/heb/SelfService/Login/", "https://www.linkedin.com/start/join?trk=login_reg_redirect&session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fpeople%2Fpymk%2Fhub%3Fref%3Dglobal-nav%26trk%3Dnav_utilities_invites_header", "https://facebok-com.com/facebook/u3nmekvgn2/login.html", "https://login.microsoftonline.com/login.srf?wa=wsignin1.0&rpsnv=4&ct=1464676725&rver=6.7.6640.0&wp=MCMBI&wreply=https%3a%2f%2fportal.office.com%2flanding.aspx%3ftarget%3d%252fHome&lc=1033&id=501392&msafed=0&client-request-id=e1cf9c30-8fd4-4983-91ae-c94619d8e689", "https://secure-gamil.com/#identifier", "https://friends.walla.co.il/#/login", "https://walla-shops.com/Login/Online/"];

$.widget("ui.dialog", $.extend({}, $.ui.dialog.prototype, {
    _title: function(title) {
        if (!this.options.title ) {
            title.html("&#160;");
        } else {
            title.html(this.options.title);
        }
    }
}));

// get "settings", "groupData" and "fakeSiteData" from "background.js"
chrome.runtime.sendMessage({method:'initData'}, onSettingsReceived);
function onSettingsReceived (response) {
    settings = response.settings;
    groupData = response.groupData;
	fakeSiteData = response.fakeSiteData;

	// build one big list of all fake domains listed in server (used later)
	var obj = fakeSiteData['fake_domains'];
	for (var original in obj) {
		if (obj.hasOwnProperty(original)) {
			fake_domain_list = fake_domain_list.concat(obj[original]);
		}
	}
	// call initialization function
    init();
}

// initialization function - checks for active attacks and acts accordingly
function init () {
	// get current URL
	var url = window.location.href;
	var normalized_url = normalizeURL(url);
	/* 
	 * if current URL is one of our fake domains, and if we're not 
	 * in the initial test phase, write fake login page onto empty page
	 */
	if (fake_domain_list.indexOf(url) > -1 && !settings['in_init_test']){
		showFake(url, settings['fake_attack']);
		return;
	}
	/* 
	 * if checking for a login form is relevant, and if we're not in initial
	 * test phase, and if we're not in the control or feedback groups - check for login forms
	 */
    if (settings['loginInputCheck'] && !settings['in_init_test'] && groupData['group'] !== "control" && groupData['group'] !== "feedback") 
        loginInputCheck();

	if(settings['whitelist'].indexOf(normalized_url) === -1){
		// if a relevant attack is active - run it
		if (settings['attack'] === 'showModal')
			showModal('random', false);
		else if (settings['attack'] === 'showModalURL')
			showModal('random', true);
		else if (settings['attack'] === 'showAd')
			showAd();
	}
	// if we're in initial test phase, but not in the training phase nor in final test, launch choice modal and/or write fake login page
	if(settings['in_init_test'] && !settings['in_training'] && !settings['final_test'])
		test_management(url);

	// if we're in initial training phase
	else if(settings['in_init_test'] && (settings['in_training'] || settings['final_test'])){
		// if we're not in control or feedback groups, check for login form, and launch choice modal and/or write fake login page
		if(groupData['group'] !== "control" && groupData['group'] !== "feedback"){
			loginInputCheck();
			test_management(url);
		}
		// if we're in either control or feedback groups
		else{
			// if we're in the control group's phishing game, run special game modal
			if(url === "http://www.ucl.ac.uk/cert/antiphishing/")
				run_game_modal();
			// we're in the feedback group's training phase, launch choice modal and/or write fake login page
			else
				test_management(url);
		}
	}
	// request "background.js" to create context menu (except for "button" group in initial phase)
	if (settings['init_done'] || groupData['group'] !== "button")
		chrome.runtime.sendMessage({method:'createContextMenuItem'});
}

// this function writes the encoded fake login files from DropBox onto current page
function fake_for_test(url){
	// get specific encoded login page from DropBox
	$.get(url + "?raw=1", function(resp){
		// decode HTML
		var plaintext = Base64.decode(resp); 
		// write decoded login page onto current page
		document.open();
		document.write(plaintext);
		document.close();
	}, 'html');
	// display choice modal once the page was decoded and displayed
	modalInterval = setInterval(function() {if(decoded) try_again(false);}, 1000);
}

// displays special game modal ("finished playing, take me to final test")
function run_game_modal(){
	// get modal HTML from server
	$.get("https://chordor.pythonanywhere.com/ads/game.html", function(resp){ 
		var data = $($.parseHTML(resp));
		// set button click function - forward to final test
		data.on('click', '#game', function () {window.location.href = chrome.extension.getURL("html/before_final_test.html");});
		// define modal window
		data.modal({
			closeHTML:"",
			containerCss:{
				scrollbars:"no",
				backgroundColor:"#f5f5f5", 
				borderColor:"#fff",             
				height:150,
				width:220
			},
			overlayClose:false,
			escClose:false
		});
	}, 'html');
}

// display choice modal for test phase
function run_choice_modal(dont_know){
	// get HTML code for modal
	$.get("https://chordor.pythonanywhere.com/ads/test.html", function(resp){ 
		var data = $($.parseHTML(resp));
		// get current URL
		var url = window.location.href;
		// define modal parameters
		data.modal({
			closeHTML:"",
			containerCss:{
				scrollbars:"no",
				backgroundColor:"#f5f5f5", 
				borderColor:"#fff",             
				height:250,
				width:220
			},
			overlayClose:false,
			escClose:false,
			// what happens when modal is opened
			onShow: function (dialog) {
				// set boolean flag (so we know it is displayed)
				modal_shown = true;
				// we can stop trying to display modal
				clearInterval(modalInterval);
				// if we're in the first 10-second timer part
				if(!dont_know){
					// create 10-second counter function
					testCounterID = setInterval(test_counter, 1000);
					// display "10" at beginning of timer
					var seconds_left = 11;
					$("#timer", dialog.data).text(--seconds_left);
					// every second decrease number displayed
					interval = setInterval(function() {
						$("#timer", dialog.data).text(--seconds_left);
						// when 10 seconds are up, show message and close current modal
						if (seconds_left <= 0){
							$("#timer", dialog.data).text("Time over!");
							clearInterval(interval);
							$.modal.close();
						}
					}, 1000);
				}
				// if this is the second modal phase, don't show timer
				else{
					$('#timer').css('display','none');
				}
				$('#simplemodal-overlay').css({'height': '250px', 'width': '220px', 'top': '128.5px'});
			}
		});
	}, 'html');
	$('#simplemodal-overlay').css({'height': '250px', 'width': '220px', 'top': '128.5px'});
}

// logical (not visual) timer for tests
function test_counter(){
	// increase timer
	testCounter++;
	// when 10 seconds are up, clear timer, clear page, and run new modal without counter
	if(testCounter > 10){
		clearInterval(testCounterID);
		document.body.innerHTML = "";
		modal_shown = false;		
		modalInterval = setInterval(function() { try_again(true); }, 500);
	}
}

// try displaying modal until it is displayed correctly
function try_again(dont_know){
	if (!modal_shown)
		run_choice_modal(dont_know);
}

// register functions for message passing from other scripts
chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
	// other script asks to display blacklist warning on page
    if (message.method === 'showBlacklistWarning')
        showBlacklistWarning(message.url);
	// other script asks to display notification on page
    else if (message.method === 'showNotification')
        showNotification(message.message);
	// show special blacklist warning on page
    else if (message.method === 'showBlackListDialog')
        showBlackListDialog(message.suspicious_url);
	// show tip
	else if (message.method === 'showTip')
		showTip(message.url);
	// user from "button" group tried to use safe login process not on whitelisted site (maybe phishing attack)
	else if (message.method === 'showButtonMessage' && settings['whitelist'].indexOf(normalizeURL(window.location.href)) === -1)
		button_message();
	// show the "Test Me" confirmation dialog
	else if (message.method === 'showTestMe')
		test_me();
	// show modal frame
	else if (message.method === 'showModal')
		showModal(message.type);
	// show "don't know" dialog
	else if (message.method === 'dont_know_dialog')
		dont_know_message(message.url);
	// direct user to next site in test
	else if (message.method === 'next_site')
		next_site(message.url, message.choice);
	// user reported on suspicious ad or frame
	else if (message.method === 'close_ad_or_frame'){
		closed_with_button = true;
		$.modal.close();
	}
	else if (message.method === 'stop_modal_timer'){
		clearInterval(testCounterID);
		clearInterval(interval);
	}
	else if (message.method === 'close_overlay'){
		// close overlay and cancel body alert
		$.modal.close();
		$('body').off('click');
	}
});

// launches modal attack
function showModal(type, special_url_frame) {
	var type_of_frame_launched;
    $(document).ready(function () {
		if (type === 'random'){
			if(special_url_frame){
				var frameIndex = Math.floor(Math.random() * groupData['frames_URL'].length);
				var frame_name = groupData['frames_URL'][frameIndex];
				type_of_frame_launched = 'frames_URL_launched';
			}
			else{
				var frameIndex = Math.floor(Math.random() * groupData['frames_no_URL'].length);
				var frame_name = groupData['frames_no_URL'][frameIndex];
				type_of_frame_launched = 'frames_no_URL_launched';
			}
		}
		else{
			// find a specific frame by type (Google, Facebook, etc.)
			for (var i = 0; i < groupData['frames_all'].length; i++){
				if (groupData['frames_all'][i].indexOf(type) > -1){
					var frame_name = groupData['frames_all'][i];
					type_of_frame_launched = 'general_frame_launched';
					break;
				}
			}
		}
		// update server - frame displayed
		logAction(type_of_frame_launched, frame_name, 'good_luck');
		// get HTML code of desired frame
        $.get("https://chordor.pythonanywhere.com/frames_all/" + frame_name, function(resp){
            var data = $($.parseHTML(resp));
			// set "overlay" boolean flag (if user can exit frame by clicking outside frame)
			var overlay = data.find('#overlay').text() === "true" ? true : false;
			// get height and width parameters from HTML code
			var height = Math.floor(data.find('#height').text());
			var width = Math.floor(data.find('#width').text());
			// set button listeners for frame
            prepareModalData(data, frame_name);
			// define modal parameters
            data.modal({
                closeHTML:"",
                containerCss:{
                    scrollbars:"no",
                    backgroundColor:"#fff", 
                    borderColor:"#fff",           
		            height:height,
                    width:width
                },
                overlayClose: overlay,
				// function for modal close (by overlay or by cancel button, but only overlay is relevant here)
				onClose: function (dialog) {
					// if modal was closed by clicking outside of frame - succeeded
					if (!closed_with_button){
						// update server and register outcome
						logAction(frame_name, 'overlay_close', 'passed');
						chrome.runtime.sendMessage({method: 'registerOutcome', success: true, feedback: [null, "Great job! You didn't log into a fake login frame!"]});
					}
					// close modal
					$.modal.close();
				},
				onShow: function (dialog) {
					$("#close-modal", dialog.data).click(function(e){
						e.stopPropagation();
						logAction(frame_name, 'clicked_exit_modal', 'passed');
						chrome.runtime.sendMessage({method: 'registerOutcome', success: true, feedback: [null, "Great job! You didn't log into a fake login frame!"]});
						$.modal.close();
					});
				},
                escClose:false
            });
        }, 'html');
    });   
}

// sets button listeners for frame attack
function prepareModalData (data, frame_name) {
	var failed = false;
	// user clicked on login button where there are 2 phases
	data.on('click', '#login_first_second', function () {
		// user clicked first time, not yet failed
		if(!failed){
			logAction(frame_name, 'login_empty_details', 'not_yet_failed');
			failed = true;
		}
		// user clicked twice, assume failure
		else{
			closed_with_button = true;
			// register outcome of attack and update server
			chrome.runtime.sendMessage({method: 'registerOutcome', success: false, feedback: ["Sorry, you have tried to log into a fake login frame!", null]});
			logAction(frame_name, 'login_with_details', 'failed');
			// close modal
			$.modal.close();
		}
    });
	// user clicked first phase's login button, not failed yet, just update server
	data.on('click', '#first_login_button', function () {
		logAction(frame_name, 'clicked_first_login', 'maybe_will_fail');
    });
	// user tried to login - failed
    data.on('click', '#login_button', function () {
		// update server and register outcome of attack
		logAction(frame_name, 'clicked_login', 'maybe_failed');
		chrome.runtime.sendMessage({method: 'registerOutcome', success: false, feedback: ["Sorry, you have tried to log into a fake login frame!", null]});
		closed_with_button = true;
		// close modal
        $.modal.close();
    });
	// user didn't try to login - succeeded
    data.on('click', '#cancel_button', function () {
		// update server and register outcome of attack
		logAction(frame_name, 'clicked_cancel', 'passed');
		chrome.runtime.sendMessage({method: 'registerOutcome', success: true, feedback: [null, "Great job! You didn't log into a fake login frame!"]});
		closed_with_button = true;
		// close modal
        $.modal.close();
    });
	// transfer user to random fake domain that corresponds with modal (if any), when user clicks the URL bar
	var original = data.find('#original').text();
	// if this is a modal with a URL bar
	if (original){
		// get list of fake domains relevant to this modal frame
		var fake_domains = fakeSiteData['fake_domains'][original];
		// when URL bar is clicked, user is directed to one of the relevant fake domains
		data.on('click', '#url_bar', function () {
			if (fake_domains){
				logAction(frame_name, 'clicked_url_bar', 'update');
				chrome.runtime.sendMessage({method: 'set', key: 'attack', value: null});
				chrome.runtime.sendMessage({method: 'set_fake_attack', type: 'url_bar'});
				var fakeDomainIndex = Math.floor(Math.random()*fake_domains.length);
				window.location.href = fake_domains[fakeDomainIndex];
			}
		});
	}
}

// write fake login page onto current page when user visits fake domain
function showFake(url, origin) {
	// compute the specific original URL for current fake domain, and get its list of fake login pages on server
	var obj = fakeSiteData['fake_domains'];
	var original_url;
	var fake_files;
	for (var original in obj) {
		if (obj.hasOwnProperty(original) && obj[original].indexOf(url) > -1) {
			original_url = original;
			fake_files = fakeSiteData['fake_files'][original];
			break;
		}
	}
	// display frame (for google/facebook) instead of actual page 1/10 of the time
	if((original_url.indexOf("google") > -1 || original_url.indexOf("gmail") > -1) && (Math.random() < 0.1)){
		showModal('google');
		return;
	}
	else if((original_url.indexOf("facebook") > -1) && (Math.random() < 0.1)){
		showModal('facebook');
		return;
	}
	else{
		// get random fake login page index
		var fakeFileIndex = Math.floor(Math.random() * fake_files.length);
		// get fake login page name
		var fake_file_name = fake_files[fakeFileIndex];
		// URL of fake login page on DropBox
		var url = "https://www.dropbox.com/s/" + fake_file_name;
		// update server that fake login page is being displayed
		logAction('fake_site_displayed', fake_file_name, 'attack: ' + origin);
		$(document).ready(function () {
			// get fake login page HTML from DropBox
			$.get(url + "?raw=1", function(resp){
				// decode HTML
				var plaintext = Base64.decode(resp); 
				var data = $($.parseHTML(plaintext));
				// write decoded HTML onto page
				document.open();
				document.write(plaintext);
				document.close();
				// set login button listener to update server of failure, register outcome, and direct user to original URL
				$("html").on('click', '#fake_login_button', function () {
					logAction('fake_site_origin: ' + origin, 'failure_logged_in', fake_file_name);
					var feedback_message;
					if(origin === 'ad')
						feedback_message = "Sorry, but you have been directed to this phishing site by clicking on a malicious ad. Next time, try to be more careful.";
					else				
						feedback_message = "Sorry, but you tried logging into a phishing website!";
					chrome.runtime.sendMessage({method: 'registerOutcome', success: false, feedback: [feedback_message, null]});
					setTimeout(function () {window.location.href = original_url;}, 4000);
				});
			}, 'html');
		});
	}
	setTimeout(function () {show_login_dialog();}, 4000);
}

// launch ad attack
function showAd () {
    $(document).ready(function () {
		// get random ad index
        var adIndex = Math.floor(Math.random() * groupData['ads'].length);
		// get ad name
		var ad_name = groupData['ads'][adIndex];
		// update server that ad is being launched
		logAction('ad_launched', ad_name, 'good_luck');
		// get ad HTML
        $.get("https://chordor.pythonanywhere.com/ads/" + ad_name, function(resp){	
            var data = $($.parseHTML(resp));
			// set height and color of modal frame
			var height = 200;
			var backgroundColor = "#f5f5f5";
			if (ad_name === "facebook_new.html" || ad_name === "facebook_new_no_image.html") {
				height = 100;
				backgroundColor = "#ffffff";
			}
			// set click listener for ad
            prepareAdData(data, ad_name);
			// define modal parameters
            data.modal({
                closeHTML:"",
                containerCss:{
                    scrollbars:"no",
                    backgroundColor:backgroundColor, 
                    borderColor:"#fff",             
                    height:height,
                    width:280
                },
                overlayClose:false,
                escClose:false,
				onShow: function (dialog) {
					$("#close-modal", dialog.data).click(function(e){
						e.stopPropagation();
						logAction(ad_name, 'clicked_exit_ad', 'update');
						chrome.runtime.sendMessage({method: 'set', key: 'attack', value: null});
						$.modal.close();
					});
				}
            });
        }, 'html');
    }); 
}

// sets click listener for ad attack
function prepareAdData (data, ad_name) {
    data.on('click', null, function () {
		// update server that ad was clicked
        logAction(ad_name, 'clicked_ad', 'update');
		// reset attack, since user already clicked
		chrome.runtime.sendMessage({method: 'set', key: 'attack', value: null});
		// transfer user to random fake domain that corresponds with ad (if any)
		var original = data.find('#original').text();
		var fake_domains = fakeSiteData['fake_domains'][original];
		if (fake_domains){
			chrome.runtime.sendMessage({method: 'set_fake_attack', type: 'ad'});
			var fakeDomainIndex = Math.floor(Math.random()*fake_domains.length);
			window.location.href = fake_domains[fakeDomainIndex];
		}
    });
}

// auxiliary function for cleaning up URL (only protocol with 3 first elements, e.g. "https://www.google.com/")
function normalizeURL(url) {
    var urlParts = url.split('/');
    urlParts = urlParts.slice(0, 3).concat([""]);
    return urlParts.join('/');
}

// check for login form on current page, and display appropriate message
function loginInputCheck () {
	// if indeed we have a login form on page
    if (hasLogin()) {
		// if current page is in whitelist and we're in "image" group, we might want to show image selection page
		if (settings['whitelist'].indexOf(normalizeURL(window.location.href)) !== -1 && groupData['group'] === 'image') {
			// check with "background.js" if we already displayed the image selection page
			chrome.runtime.sendMessage({method:'get_confirmed'}, function(response){
				// if not - show image selection page
				if (!response.confirmed && settings['rightImagePath'])
					window.location.href = chrome.extension.getURL("html/confirm.html");
			});
        }
		// if current page is in whitelist and we're in "button" group, we want to lock fields, etc.
		else if (settings['whitelist'].indexOf(normalizeURL(window.location.href)) !== -1 && groupData['group'] === 'button') {
			// update "background.js" that we are now disabling fields
			chrome.runtime.sendMessage({method: 'set_disabled'});
			settings['disabled'] = true;
			// disable fields by using modal overlay over site
			$.get("https://chordor.pythonanywhere.com/frames_all/empty_popup.html", function(resp){ 
				var data = $($.parseHTML(resp));
				// define modal parameters
				data.modal({
					closeHTML:"",
					containerCss:{
						scrollbars:"no",
						backgroundColor:"#fff", 
						borderColor:"#fff", 
						height:0,
						width:0
					},
					overlayClose: false,
					onShow: function (dialog) {
						$('body').off().on('click', function() {
							button_protection();
						});
					},
					escClose:false
				});
			}, 'html');
			// update server that we just disabled fields
			logAction('button_protection', 'disabled_buttons', 'update');
			// do not continue with showing the below dialog
			return;
        }
		// if page isn't already in whitelist, and we're not in initial phase, show dialog to user
		if (settings['whitelist'].indexOf(normalizeURL(window.location.href)) === -1 && !settings['in_init_test'])
			show_login_dialog();
    }
}

function show_login_dialog(){
	// create dialog strings
	var actionName = 'login_choice';
	var href_link = chrome.extension.getURL("html/how_to_check.html");
	var dialog = $("<p dir='ltr'>This site seems to contain a login form. What should Shark-King do? <b><br><br>Note:</b> If it appears to be the same site as one of your trusted sites, check carefully if it isn\'t a phishing site! (<a target='_blank' style='color:blue;text-decoration:underline;' href='" + href_link + "'>How to check?</a>)</p>");
	// set dialog properties
	var dialogProperties = {
		autoOpen:false,
		modal: false,
		closeOnEscape: false, 
		title: '<img src="' + black_v + '" /> Shark-King',
		open: function(event, ui) { 
			$(".ui-dialog-titlebar-close", ui.dialog | ui).hide(); 
			$('.ui-button-text').css('white-space', 'normal');
			$('.ui-dialog').css('z-index', 6000);
			$('.ui-dialog').css('font-family', 'Arial');
			$('.ui-dialog').css('font-size', '14px');
			$('.ui-dialog').css('text-align', 'left');
		}
	};
	// set dialog buttons
	dialogProperties.buttons =  {
		// user marks site as trusted - add to whitelist, update server, close dialog
		"It is a trusted login site, mark as Trusted": 
			function() {
				var $this = $(this);
				chrome.runtime.sendMessage({
					method:"addToList",
					list: "whitelist",
					url: normalizeURL(window.location.href)
				}, function (response) {
					logAction(actionName, 'whitelist_add', $('#feedback').val() + ':update')
					$this.dialog("close");
				});
			},
		// user marks site as suspicious - add to blacklist, update server, close dialog
		"It seems to be a phishing site, mark as Suspect":  
			function() {
				var $this = $(this);
				chrome.runtime.sendMessage({
					method:"addToList",
					list: "blacklist",
					url: window.location.href
				}, function (response) {
					logAction(actionName, 'blacklist_add', $('#feedback').val() + ':update')
					$this.dialog("close");
				});
			},
		// user wants to ignore this site - add to ignore list, update server, close dialog
		"Do not ask again (on this site)":
			function() {
				var $this = $(this);
				chrome.runtime.sendMessage({
					method:"addToList",
					list: "ignoredlist",
					url: normalizeURL(window.location.href)
				}, function (response) {
					logAction(actionName, 'ignoredlist_add', $('#feedback').val() + ':update')
					$this.dialog("close");
				});
			}
	}
	// open dialog
	dialog.dialog(dialogProperties).dialog("open");
	var maxWidth = Math.max.apply(null, $(".ui-button").map( function () {
		return $( this ).outerWidth( true );
	}).get() );
	var maxHeight = Math.max.apply(null, $(".ui-button").map( function () {
		return $( this ).outerHeight( true );
	}).get() );
	maxHeight = maxHeight + 10;
	maxWidth = maxWidth - 10;
	$(".ui-button").css({"width" : ""+maxWidth+""});
	$(".ui-button").css({"height" : ""+maxHeight+""});
	$('.ui-dialog :button').blur();
}

// check for login form on page
function hasLogin () {
	// look for input elements of type "password"
    var inputs = document.getElementsByTagName('input');
    for (var i = 0; i < inputs.length; i++) {
        if (inputs[i].type === 'password') {
            return true;
        };
    };
    return false;
}

// show blacklist warning on page
function showBlacklistWarning (url) {
	// create warning string
	var dialog = $("<p dir='ltr'>You're about to enter a site that was marked as Suspect. What would you like to do? <br>"
        + "Enter feedback here (optional): <br><br><textarea rows='4' cols='28' id='feedback' /></p>");
	// set dialog properties
	var dialogProperties = {
        autoOpen:false,
        modal: false,
        closeOnEscape: false,
		title: '<img src="' + black_v + '" /> Shark-King',
		resizable: false,
        open: function(event, ui) { 
			$(".ui-dialog-titlebar-close", ui.dialog | ui).hide(); 
			$('.ui-button-text').css('white-space', 'normal');
			$('.ui-dialog').css('z-index', 6000);
			$('.ui-dialog').css('font-family', 'Arial');
			$('.ui-dialog').css('font-size', '14px');
		}
    };
	// set dialog buttons
    dialogProperties.buttons =  {
		// user agrees not to visit - update server and close dialog
        "Do not visit Suspect site": 
            function() {
				var $this = $(this);
				logAction('blacklist_choice', 'heed_warning', $('#feedback').val() + ':update');
                $this.dialog("close");
            },
		// user ignores warning and continues - let user continue to this URL, update server and close dialog
        "Ignore warning and continue":  
            function() {
				var $this = $(this);
                chrome.runtime.sendMessage({
                    method: 'set',
                    key: 'ignore',
                    value: url
                }, function (response) {
					logAction('blacklist_choice', 'ignore_warning', $('#feedback').val() + ':update');
                    $this.dialog("close");
                    window.location.assign(url);
                });
            },
		// user ignores warning and removes from blacklist - remove from blacklist, update server and close dialog
        "Ignore warning and remove site from the Suspect list":
            function() {
				var $this = $(this);
                chrome.runtime.sendMessage({
                    method:"removeFromList",
                    list: "blacklist",
                    url: url
				}, function (response) {
					logAction('blacklist_choice', 'remove_from_blacklist', $('#feedback').val() + ':update')
					$this.dialog("close");
					window.location.assign(url);
                });
            }
    }
	// open dialog
    dialog.dialog(dialogProperties).dialog("open");
	var maxWidth = Math.max.apply(null, $(".ui-button").map( function () {
		return $( this ).outerWidth( true );
	}).get() );
	var maxHeight = Math.max.apply(null, $(".ui-button").map( function () {
		return $( this ).outerHeight( true );
	}).get() );
	maxHeight = maxHeight + 10;
	maxWidth = maxWidth - 10;
	$(".ui-button").css({"width" : ""+maxWidth+""});
	$(".ui-button").css({"height" : ""+maxHeight+""});
	$('.ui-dialog :button').blur();
}
// show notification on page
function showNotification (message) {
	// create notification string
	var dialog = $("<p dir='ltr'>" + message + "</p>");
	// set dialog properties
	dialog.dialog({
		autoOpen:false,
		modal: false,
		closeOnEscape: false,
		title: '<img src="' + black_v + '" /> Shark-King',
		open: function(event, ui) { 
			//setTimeout(function(){dialog.dialog('close');}, 4000);
			$('.ui-dialog').css('z-index', 6000);
			$('.ui-dialog').css('font-family', 'Arial');
			$('.ui-dialog').css('font-size', '14px');
			$('.ui-dialog').css('text-align', 'left');
		},
	// open dialog
	}).dialog('open');
	$('.ui-dialog :button').blur();
}

// show blacklist warning dialog (user blacklisted page because of attack)
function showBlackListDialog (suspicious_url) {
	// first close ad or frame
	closed_with_button = true;
	$.modal.close();
	// create dialog string
    var dialog = $("<p dir='ltr'>You might have chosen to mark this site as Suspect because of one of our experiments. If this is the case, please do not mark this site as Suspect. If you noticed a suspect ad, please click instead on 'Report Suspect Ad'.</p>");
	// set dialog properties
    var dialogProperties = {
        autoOpen:false,
        modal: false,
        closeOnEscape: false, 
		title: '<img src="' + black_v + '" /> Shark-King',
        open: function(event, ui) { 
			$(".ui-dialog-titlebar-close", ui.dialog | ui).hide(); 
			$('.ui-button-text').css('white-space', 'normal');
			$('.ui-dialog').css('z-index', 6000);
			$('.ui-dialog').css('font-family', 'Arial');
			$('.ui-dialog').css('font-size', '14px');
		}
    };
	// set dialog buttons
	dialogProperties.buttons =  {
		// user still marks site as suspicious - add to blacklist, update server, register outcome, close dialog
		"Mark site as Suspect": function() {
			var $this = $(this);
			chrome.runtime.sendMessage({method:"addToList", list: "blacklist", url: suspicious_url});
			logAction('blacklist_dialog_choice', 'add', suspicious_url);
			chrome.runtime.sendMessage({method: 'registerOutcome', success: true, feedback: [null, "You've marked a suspect site correctly, great job!"]});
			$this.dialog("close");
		},
		// user doesn't mark site as suspicious - update server, register outcome, close dialog
		"Thanks, do not mark site as Suspect": function() {
			var $this = $(this);
			// we do not use "registerOutcome" here ebcause we don't want to reset the attack, since ad is still active
			logAction('blacklist_dialog_choice', 'do_not_add', suspicious_url);
			showNotification("You haven't marked the website as suspect, but you're still awarded points for awareness!");
			chrome.runtime.sendMessage({method:'incrementPoints'});
			$this.dialog("close");
		}
	}
	// open dialog
	dialog.dialog(dialogProperties).dialog("open");
	var maxWidth = Math.max.apply(null, $(".ui-button").map( function () {
		return $( this ).outerWidth( true );
	}).get() );
	var maxHeight = Math.max.apply(null, $(".ui-button").map( function () {
		return $( this ).outerHeight( true );
	}).get() );
	maxHeight = maxHeight + 10;
	maxWidth = maxWidth - 10;
	$(".ui-button").css({"width" : ""+maxWidth+""});
	$(".ui-button").css({"height" : ""+maxHeight+""});
	$('.ui-dialog :button').blur();
}

// update server
function logAction (actionName, choice, feedback) {
    var pendingURL = settings['pendingURL'];
	chrome.runtime.sendMessage({method: 'logAction', action: actionName, data: [pendingURL, choice, feedback].join(':'), hostname: new URL(window.location.href).hostname});
}

// show tip on page
function showTip(url){
	// set modal parameters
	$.modal('<iframe src="' + url + '" height="500" width="600" style="border:2; border-color:green;" scrolling="no" seamless="seamless">', {
		closeHTML:"",
		containerCss:{
			scrollbars:"no",
			backgroundColor:"#f5f5f5", 
			height:510, 
			padding:0, 
			width:610
		},
		overlayClose:true
	});
}

// manages test phase - calls functions to write fake login page or run choice modal
function test_management(url){
	var fake_url = false;
	// compute the specific original URL for current fake domain, and get its list of fake login pages on server
	var obj = fakeSiteData['fake_domains'];
	for (var original in obj) {
		if (obj.hasOwnProperty(original) && obj[original].indexOf(url) > -1) {
			var original_url = original;
			var fake_files = fakeSiteData['fake_files'][original];
			fake_url = true;
			break;
		}
	}
	// if the current URL is one of our fake domains
	if (fake_url){
		// get random login page
		var fakeFileIndex = Math.floor(Math.random() * fake_files.length);
		var fake_file_name = fake_files[fakeFileIndex];
		var fake_file_url = "https://www.dropbox.com/s/" + fake_file_name;
		// call function to write fake login page
		fake_for_test(fake_file_url);
	}
	// URL isn't one of our fake domains, enough to run choice modal
	else{
		for(var i = 0; i<URL_array.length; i++){
			if(URL_array[i].indexOf(url) > -1){
				run_choice_modal(false);
				break;
			}
		}
	}
}

/*
 * This set of functions simply updates the server with
 * user's choice during the test phase (right/wrong, etc.)
 * it also shows feedback if relevant for group
 */
var green_v = chrome.extension.getURL('icons/good19.png');

var secure_images = chrome.extension.getURL('images/image_protection.png');
var secure_button = chrome.extension.getURL('images/button_protection.png');
function safe_wrong(url, test_or_train, next_url){
	logAction(test_or_train, 'failed_clicked_safe', url);
	if (test_or_train === "train"){
		if ("https://facebok-com.com/facebook/u3nmekvgn2/login.html".indexOf(normalizeURL(url)) > -1){
			if (groupData['group'] === "feedback")
				show_feedback_message(next_url, '<p dir="ltr">Sorry, but this site is not safe! You should have noticed that facebok-com.com is different than the original domain facebook.com. When a site name includes a hyphen (-), this usually means it\'s a fake site.</p>');
			else if (groupData['group'] === "image")
				show_feedback_message(next_url, '<p dir="ltr">Sorry, but this site is not safe! You should have noticed that facebok-com.com is different than the original domain facebook.com. When a site name includes a hyphen (-), this usually means it\'s a fake site. In addition, did you notice that the safe login process with the 4 images was missing? If a site is in the list of Trusted Sites, before logging in you will always see the image selection process, requiring you to select your correct unique image (example below). <br><br><img style="height:50%;width:90%;" src="' + secure_images + '"><br><br> Moreover, did you notice the black V icon (<img src="' + black_v + '">)? The black V indicates that the site isn\'t in the list of Trusted Sites. The green V (<img src="' + green_v + '">) indicates that the site is in the list of Trusted Sites.</p>');
			else if (groupData['group'] === "button")
				show_feedback_message(next_url, '<p dir="ltr">Sorry, but this site is not safe! You should have noticed that facebok-com.com is different than the original domain facebook.com. When a site name includes a hyphen (-), this usually means it\'s a fake site. In addition, did you notice that when you clicked the Shark-King V icon it did not display a message stating that the site is safe (example below)? <br><br><img style="width:80%;" src="' + secure_button + '"><br><br> Before logging in, you should always click the Shark-King V icon. If the site is in the list of Trusted Sites, you will see a message stating that the site is safe. Moreover, did you notice the black V icon (<img src="' + black_v + '">)? The black V indicates that the site isn\'t in the list of Trusted Sites. The green V (<img src="' + green_v + '">) indicates that the site is in the list of Trusted Sites.</p>');
		}
		else if ("https://secure-gamil.com/#identifier".indexOf(normalizeURL(url)) > -1){
			if (groupData['group'] === "feedback")
				show_feedback_message(next_url, '<p dir="ltr">Sorry, but this site is not safe! You should have noticed that secure-gamil.com is different than the original domain gmail.com. When a site name includes a hyphen (-), this usually means it\'s a fake site.</p>');
			else if (groupData['group'] === "image")
				show_feedback_message(next_url, '<p dir="ltr">Sorry, but this site is not safe! You should have noticed that secure-gamil.com is different than the original domain gmail.com. When a site name includes a hyphen (-), this usually means it\'s a fake site. In addition, did you notice that the safe login process with the 4 images was missing? If a site is in the list of Trusted Sites, before logging in you will always see the image selection process, requiring you to select your correct unique image (example below). <br><br><img style="height:50%;width:90%;" src="' + secure_images + '"><br><br> Moreover, did you notice the black V icon (<img src="' + black_v + '">)? The black V indicates that the site isn\'t in the list of Trusted Sites. The green V (<img src="' + green_v + '">) indicates that the site is in the list of Trusted Sites.</p>');
			else if (groupData['group'] === "button")
				show_feedback_message(next_url, '<p dir="ltr">Sorry, but this site is not safe! You should have noticed that secure-gamil.com is different than the original domain gmail.com. When a site name includes a hyphen (-), this usually means it\'s a fake site. In addition, did you notice that when you clicked the Shark-King V icon it did not display a message stating that the site is safe (example below)? <br><br><img src="' + secure_button + '"><br><br> Before logging in, you should always click the Shark-King V icon. If the site is in the list of Trusted Sites, you will see a message stating that the site is safe. Moreover, did you notice the black V icon (<img src="' + black_v + '">)? The black V indicates that the site isn\'t in the list of Trusted Sites. The green V (<img src="' + green_v + '">) indicates that the site is in the list of Trusted Sites.</p>');
		}
		else if ("https://walla-shops.com/Login/Online/".indexOf(normalizeURL(url)) > -1){
			if (groupData['group'] === "feedback")
				show_feedback_message(next_url, '<p dir="ltr">Sorry, but this site is not safe! You should have noticed that walla-shops.com is different than the original domain wallashops.co.il. When a site name includes a hyphen (-), this usually means it\'s a fake site.</p>');
			else if (groupData['group'] === "image")
				show_feedback_message(next_url, '<p dir="ltr">Sorry, but this site is not safe! You should have noticed that walla-shops.com is different than the original domain wallashops.co.il. When a site name includes a hyphen (-), this usually means it\'s a fake site. In addition, did you notice that the safe login process with the 4 images was missing? If a site is in the list of Trusted Sites, before logging in you will always see the image selection process, requiring you to select your correct unique image (example below). <br><br><img style="height:50%;width:90%;" src="' + secure_images + '"><br><br> Moreover, did you notice the black V icon (<img src="' + black_v + '">)? The black V indicates that the site isn\'t in the list of Trusted Sites. The green V (<img src="' + green_v + '">) indicates that the site is in the list of Trusted Sites.</p>');
			else if (groupData['group'] === "button")
				show_feedback_message(next_url, '<p dir="ltr">Sorry, but this site is not safe! You should have noticed that walla-shops.com is different than the original domain wallashops.co.il. When a site name includes a hyphen (-), this usually means it\'s a fake site. In addition, did you notice that when you clicked the Shark-King V icon it did not display a message stating that the site is safe (example below)? <br><br><img src="' + secure_button + '"><br><br> Before logging in, you should always click the Shark-King V icon. If the site is in the list of Trusted Sites, you will see a message stating that the site is safe. Moreover, did you notice the black V icon (<img src="' + black_v + '">)? The black V indicates that the site isn\'t in the list of Trusted Sites. The green V (<img src="' + green_v + '">) indicates that the site is in the list of Trusted Sites.</p>');
		}
	}
}
function safe_right(url, test_or_train, next_url){
	logAction(test_or_train, 'success_clicked_safe', url);
	if (test_or_train === "train"){
		if ("https://www.linkedin.com/start/join?trk=login_reg_redirect&session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fpeople%2Fpymk%2Fhub%3Fref%3Dglobal-nav%26trk%3Dnav_utilities_invites_header".indexOf(normalizeURL(url)) > -1){
			if (groupData['group'] === "feedback")
				show_feedback_message(next_url, '<p dir="ltr">Good job! You have noticed correctly that the domain is www.linkedin.com, and that the site is using the secure HTTPS protocol.</p>');
			else if (groupData['group'] === "image")
				show_feedback_message(next_url, '<p dir="ltr">Good job! You have noticed correctly that the domain is www.linkedin.com, and that the site is using the secure HTTPS protocol.<br><br>The green V icon (<img src="' + green_v + '">), along with the safe login process with the 4 images (example below) <br><br><img style="height:50%;width:90%;" src="' + secure_images + '"><br><br>confirm a secure login to a safe site.</p>');
			else if (groupData['group'] === "button")
				show_feedback_message(next_url, '<p dir="ltr">Good job! You have noticed correctly that the domain is www.linkedin.com, and that the site is using the secure HTTPS protocol.<br><br>The green V icon (<img src="' + green_v + '">), along with the safe login process by clicking the green V button (see image below) <br><br><img style="width:75%; height:65%;" src="' + secure_button + '"><br><br>confirm a secure login to a safe site.</p>');
		}
		else if ("https://login.microsoftonline.com/login.srf?wa=wsignin1.0&rpsnv=4&ct=1464676725&rver=6.7.6640.0&wp=MCMBI&wreply=https%3a%2f%2fportal.office.com%2flanding.aspx%3ftarget%3d%252fHome&lc=1033&id=501392&msafed=0&client-request-id=e1cf9c30-8fd4-4983-91ae-c94619d8e689".indexOf(normalizeURL(url)) > -1){
			if (groupData['group'] === "feedback")
				show_feedback_message(next_url, '<p dir="ltr">Good job! You have noticed correctly that the domain is login.microsoftonline.com, and that the site is using the secure HTTPS protocol.</p>');
			else if (groupData['group'] === "image")
				show_feedback_message(next_url, '<p dir="ltr">Good job! You have noticed correctly that the domain is login.microsoftonline.com, and that the site is using the secure HTTPS protocol.<br><br>The green V icon (<img src="' + green_v + '">), along with the safe login process with the 4 images (example below) <br><br><img style="height:50%;width:90%;" src="' + secure_images + '"><br><br>confirm a secure login to a safe site.</p>');
			else if (groupData['group'] === "button")
				show_feedback_message(next_url, '<p dir="ltr">Good job! You have noticed correctly that the domain is login.microsoftonline.com, and that the site is using the secure HTTPS protocol.<br><br>The green V icon (<img src="' + green_v + '">), along with the safe login process by clicking the green V button (see image below) <br><br><img style="width:75%; height:65%;" src="' + secure_button + '"><br><br>confirm a secure login to a safe site.</p>');
		}
		else if ("https://friends.walla.co.il/#/login".indexOf(normalizeURL(url)) > -1){
			if (groupData['group'] === "feedback")
				show_feedback_message(next_url, '<p dir="ltr">Good job! You have noticed correctly that the domain is friends.walla.co.il, which belongs to the safe domain walla.co.il.</p>');
			else if (groupData['group'] === "image")
				show_feedback_message(next_url, '<p dir="ltr">Good job! You have noticed correctly that the domain is friends.walla.co.il, which belongs to the safe domain walla.co.il.<br><br>The green V icon (<img src="' + green_v + '">), along with the safe login process with the 4 images (example below) <br><br><img style="height:50%;width:90%;" src="' + secure_images + '"><br><br>confirm a secure login to a safe site.</p>');
			else if (groupData['group'] === "button")
				show_feedback_message(next_url, '<p dir="ltr">Good job! You have noticed correctly that the domain is friends.walla.co.il, and that the site is using the secure HTTPS protocol.<br><br>The green V icon (<img src="' + green_v + '">), along with the safe login process by clicking the green V button (see image below) <br><br><img style="width:75%; height:65%;" src="' + secure_button + '"><br><br>confirm a secure login to a safe site.</p>');
		}
	}
}
function unsafe_wrong(url, test_or_train, next_url){
	logAction(test_or_train, 'failed_clicked_unsafe', url);
	if (test_or_train === "train"){
		if ("https://www.linkedin.com/start/join?trk=login_reg_redirect&session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fpeople%2Fpymk%2Fhub%3Fref%3Dglobal-nav%26trk%3Dnav_utilities_invites_header".indexOf(normalizeURL(url)) > -1){
			if (groupData['group'] === "feedback")
				show_feedback_message(next_url, '<p dir="ltr">Sorry, but this site is safe! You should have noticed that www.linkedin.com is a safe domain. It\'s very important to compare the site name and the actual URL.</p>');
			else if (groupData['group'] === "image")
				show_feedback_message(next_url, '<p dir="ltr">Sorry, but this site is safe! You should have noticed that www.linkedin.com is a safe domain. It\'s very important to compare the site name and the actual URL.<br><br>Moreover, did you notice the green V icon (<img src="' + green_v + '">) and the safe login process with the 4 images (example below)? <br><br><img style="height:50%;width:90%;" src="' + secure_images + '"><br><br>When a site is in the list of Trusted Sites, before logging in you will always see the image selection process, requiring you to select your correct unique image. This process should have helped you decide that this site is safe.</p>');
			else if (groupData['group'] === "button")
				show_feedback_message(next_url, '<p dir="ltr">Sorry, but this site is safe! You should have noticed that www.linkedin.com is a safe domain. It\'s very important to compare the site name and the actual URL.<br><br>Moreover, before logging in, you should click the green V icon (<img src="' + green_v + '">). If the site is in the list of Trusted Sites, you will see a message that indicates that the site is safe. Did you notice the green V icon (<img src="' + green_v + '">) and the message that is displayed when you click on it (example below)? <br><br><img style="width:75%; height:65%;" src="' + secure_button + '"><br><br>This process should have helped you decide that this site is safe.</p>');
		}
		else if ("https://login.microsoftonline.com/login.srf?wa=wsignin1.0&rpsnv=4&ct=1464676725&rver=6.7.6640.0&wp=MCMBI&wreply=https%3a%2f%2fportal.office.com%2flanding.aspx%3ftarget%3d%252fHome&lc=1033&id=501392&msafed=0&client-request-id=e1cf9c30-8fd4-4983-91ae-c94619d8e689".indexOf(normalizeURL(url)) > -1){
			if (groupData['group'] === "feedback")
				show_feedback_message(next_url, '<p dir="ltr">Sorry, but this site is safe! You should have noticed that login.microsoftonline.com is a safe domain. It\'s very important to compare the site name and the actual URL.</p>');
			else if (groupData['group'] === "image")
				show_feedback_message(next_url, '<p dir="ltr">Sorry, but this site is safe! You should have noticed that login.microsoftonline.com is a safe domain. It\'s very important to compare the site name and the actual URL.<br><br><br>Moreover, did you notice the green V icon (<img src="' + green_v + '">) and the safe login process with the 4 images (example below)? <br><br><img style="height:50%;width:90%;" src="' + secure_images + '"><br><br>When a site is in the list of Trusted Sites, before logging in you will always see the image selection process, requiring you to select your correct unique image. This process should have helped you decide that this site is safe.</p>');
			else if (groupData['group'] === "button")
				show_feedback_message(next_url, '<p dir="ltr">Sorry, but this site is safe! You should have noticed that login.microsoftonline.com is a safe domain. It\'s very important to compare the site name and the actual URL.<br><br>Moreover, before logging in, you should click the green V icon (<img src="' + green_v + '">). If the site is in the list of Trusted Sites, you will see a message that indicates that the site is safe. Did you notice the green V icon (<img src="' + green_v + '">) and the message that is displayed when you click on it (example below)? <br><br><img style="width:75%; height:65%;" src="' + secure_button + '"><br><br>This process should have helped you decide that this site is safe.</p>');
		}
		else if ("https://friends.walla.co.il/#/login".indexOf(normalizeURL(url)) > -1){
			if (groupData['group'] === "feedback")
				show_feedback_message(next_url, '<p dir="ltr">Sorry, but this site is safe! You should have noticed that friends.walla.co.il is a safe domain, because it belongs to walla.co.il.</p>');
			else if (groupData['group'] === "image")
				show_feedback_message(next_url, '<p dir="ltr">Sorry, but this site is safe! You should have noticed that friends.walla.co.il is a safe domain, because it belongs to walla.co.il.<br><br>Moreover, did you notice the green V icon (<img src="' + green_v + '">) and the safe login process with the 4 images (example below)? <br><br><img style="height:50%;width:90%;" src="' + secure_images + '"><br><br>When a site is in the list of Trusted Sites, before logging in you will always see the image selection process, requiring you to select your correct unique image. This process should have helped you decide that this site is safe.</p>');
			else if (groupData['group'] === "button")
				show_feedback_message(next_url, '<p dir="ltr">Sorry, but this site is safe! You should have noticed that friends.walla.co.il is a safe domain, because it belongs to walla.co.il.<br><br>Moreover, before logging in, you should click the green V icon (<img src="' + green_v + '">). If the site is in the list of Trusted Sites, you will see a message that indicates that the site is safe. Did you notice the green V icon (<img src="' + green_v + '">) and the message that is displayed when you click on it (example below)? <br><br><img style="width:75%; height:65%;" src="' + secure_button + '"><br><br>This process should have helped you decide that this site is safe.</p>');
		}
	}
}
function unsafe_right(url, test_or_train, next_url){
	logAction(test_or_train, 'success_clicked_unsafe', url);
	if (test_or_train === "train"){
		if ("https://facebok-com.com/facebook/u3nmekvgn2/login.html".indexOf(normalizeURL(url)) > -1){
			if (groupData['group'] === "feedback")
				show_feedback_message(next_url, '<p dir="ltr">Great job! You have noticed that facebok-secure.com is a fake domain. When a site name includes a hyphen (-), this usually means it\'s a fake site.</p>');
			else if (groupData['group'] === "image")
				show_feedback_message(next_url, '<p dir="ltr">Great job! You have noticed that facebok-secure.com is a fake domain. When a site name includes a hyphen (-), this usually means it\'s a fake site. Moreover, the safe login process with the 4 images was missing. This means that the site is not in the list of Trusted Sites. The black V icon (<img src="' + black_v + '">) indicates that the site isn\'t in the list of Trusted Sites. The green V (<img src="' + green_v + '">) indicates that the site is in the list of Trusted Sites.</p>');
			else if (groupData['group'] === "button")
				show_feedback_message(next_url, '<p dir="ltr">Great job! You have noticed that facebok-secure.com is a fake domain. When a site name includes a hyphen (-), this usually means it\'s a fake site. Moreover, before logging in you should always click the Shark-King V icon. If the site is in the list of Trusted Sites, you will see a message stating that the site is safe. When you clicked the Shark-King V icon, there was no message stating that the site is safe (example below). <br><br><img style="width:75%; height:65%;" src="' + secure_button + '"><br><br> The black V icon (<img src="' + black_v + '">) indicates that the site isn\'t in the list of Trusted Sites. The green V (<img src="' + green_v + '">) indicates that the site is in the list of Trusted Sites.</p>');
		}
		else if ("https://secure-gamil.com/#identifier".indexOf(normalizeURL(url)) > -1){
			if (groupData['group'] === "feedback")
				show_feedback_message(next_url, '<p dir="ltr">Great job! You have noticed that secure-gamil.com is a fake domain. When a site name includes a hyphen (-), this usually means it\'s a fake site.</p>');
			else if (groupData['group'] === "image")
				show_feedback_message(next_url, '<p dir="ltr">Great job! You have noticed that secure-gamil.com is a fake domain. When a site name includes a hyphen (-), this usually means it\'s a fake site. Moreover, the safe login process with the 4 images was missing. This means that the site is not in the list of Trusted Sites. The black V icon (<img src="' + black_v + '">) indicates that the site isn\'t in the list of Trusted Sites. The green V (<img src="' + green_v + '">) indicates that the site is in the list of Trusted Sites.</p>');
			else if (groupData['group'] === "button")
				show_feedback_message(next_url, '<p dir="ltr">Great job! You have noticed that secure-gamil.com is a fake domain. When a site name includes a hyphen (-), this usually means it\'s a fake site. Moreover, before logging in you should always click the Shark-King V icon. If the site is in the list of Trusted Sites, you will see a message stating that the site is safe. When you clicked the Shark-King V icon, there was no message stating that the site is safe (example below). <br><br><img style="width:75%; height:65%;" src="' + secure_button + '"><br><br> The black V icon (<img src="' + black_v + '">) indicates that the site isn\'t in the list of Trusted Sites. The green V (<img src="' + green_v + '">) indicates that the site is in the list of Trusted Sites.</p>');
		}
		else if ("https://walla-shops.com/Login/Online/".indexOf(normalizeURL(url)) > -1){
			if (groupData['group'] === "feedback")
				show_feedback_message(next_url, '<p dir="ltr">Great job! You have noticed that walla-shops.com is a fake domain. When a site name includes a hyphen (-), this usually means it\'s a fake site.</p>');
			else if (groupData['group'] === "image")
				show_feedback_message(next_url, '<p dir="ltr">Great job! You have noticed that walla-shops.com is a fake domain. When a site name includes a hyphen (-), this usually means it\'s a fake site. Moreover, the safe login process with the 4 images was missing. This means that the site is not in the list of Trusted Sites. The black V icon (<img src="' + black_v + '">) indicates that the site isn\'t in the list of Trusted Sites. The green V (<img src="' + green_v + '">) indicates that the site is in the list of Trusted Sites.</p>');
			else if (groupData['group'] === "button")
				show_feedback_message(next_url, '<p dir="ltr">Great job! You have noticed that walla-shops.com is a fake domain. When a site name includes a hyphen (-), this usually means it\'s a fake site. Moreover, before logging in you should always click the Shark-King V icon. If the site is in the list of Trusted Sites, you will see a message stating that the site is safe. When you clicked the Shark-King V icon, there was no message stating that the site is safe (example below). <br><br><img style="width:75%; height:65%;" src="' + secure_button + '"><br><br> The black V icon (<img src="' + black_v + '">) indicates that the site isn\'t in the list of Trusted Sites. The green V (<img src="' + green_v + '">) indicates that the site is in the list of Trusted Sites.</p>');
		}
	}
}

function dont_know(url, test_or_train, next_url){
	logAction(test_or_train, 'dont_know', url);
	if (test_or_train === "train"){
		if ("https://facebok-com.com/facebook/u3nmekvgn2/login.html".indexOf(normalizeURL(url)) > -1){
			if (groupData['group'] === "feedback")
				show_feedback_message(next_url, '<p dir="ltr">This site is not safe! You should have noticed that facebok-secure.com is different than the original domain gmail.com. When a site name includes a hyphen (-), this usually means it\'s a fake site.</p>');
			else if (groupData['group'] === "image")
				show_feedback_message(next_url, '<p dir="ltr">This site is not safe! You should have noticed that facebok-secure.com is different than the original domain gmail.com. When a site name includes a hyphen (-), this usually means it\'s a fake site. In addition, did you notice that the safe login process with the 4 images was missing? If a site is in the list of Trusted Sites, before logging in you will always see the image selection process, requiring you to select your correct unique image (example below). <br><br><img style="height:50%;width:90%;" src="' + secure_images + '"><br> Moreover, did you notice the black V icon (<img src="' + black_v + '">)? The black V indicates that the site isn\'t in the list of Trusted Sites. The green V (<img src="' + green_v + '">) indicates that the site is in the list of Trusted Sites.</p>');
			else if (groupData['group'] === "button")
				show_feedback_message(next_url, '<p dir="ltr">This site is not safe! You should have noticed that facebok-secure.com is different than the original domain gmail.com. When a site name includes a hyphen (-), this usually means it\'s a fake site. In addition, did you notice that when you clicked the Shark-King V icon it did not display a message stating that the site is safe (example below)? <br><br><img style="width:75%; height:65%;" src="' + secure_button + '"><br> Before logging in, you should always click the Shark-King V icon. If the site is in the list of Trusted Sites, you will see a message stating that the site is safe. Moreover, did you notice the black V icon (<img src="' + black_v + '">)? The black V indicates that the site isn\'t in the list of Trusted Sites. The green V (<img src="' + green_v + '">) indicates that the site is in the list of Trusted Sites.</p>');
		}
		else if ("https://secure-gamil.com/#identifier".indexOf(normalizeURL(url)) > -1){
			if (groupData['group'] === "feedback")
				show_feedback_message(next_url, '<p dir="ltr">This site is not safe! You should have noticed that secure-gamil.com is different than the original domain gmail.com. When a site name includes a hyphen (-), this usually means it\'s a fake site.</p>');
			else if (groupData['group'] === "image")
				show_feedback_message(next_url, '<p dir="ltr">This site is not safe! You should have noticed that secure-gamil.com is different than the original domain gmail.com. When a site name includes a hyphen (-), this usually means it\'s a fake site. In addition, did you notice that the safe login process with the 4 images was missing? If a site is in the list of Trusted Sites, before logging in you will always see the image selection process, requiring you to select your correct unique image (example below). <br><br><img style="height:50%;width:90%;" src="' + secure_images + '"><br> Moreover, did you notice the black V icon (<img src="' + black_v + '">)? The black V indicates that the site isn\'t in the list of Trusted Sites. The green V (<img src="' + green_v + '">) indicates that the site is in the list of Trusted Sites.</p>');
			else if (groupData['group'] === "button")
				show_feedback_message(next_url, '<p dir="ltr">This site is not safe! You should have noticed that secure-gamil.com is different than the original domain gmail.com. When a site name includes a hyphen (-), this usually means it\'s a fake site. In addition, did you notice that when you clicked the Shark-King V icon it did not display a message stating that the site is safe (example below)? <br><br><img style="width:75%; height:65%;" src="' + secure_button + '"><br> Before logging in, you should always click the Shark-King V icon. If the site is in the list of Trusted Sites, you will see a message stating that the site is safe. Moreover, did you notice the black V icon (<img src="' + black_v + '">)? The black V indicates that the site isn\'t in the list of Trusted Sites. The green V (<img src="' + green_v + '">) indicates that the site is in the list of Trusted Sites.</p>');
		}
		else if ("https://walla-shops.com/Login/Online/".indexOf(normalizeURL(url)) > -1){
			if (groupData['group'] === "feedback")
				show_feedback_message(next_url, '<p dir="ltr">This site is not safe! You should have noticed that walla-shops.com is different than the original domain wallashops.co.il. When a site name includes a hyphen (-), this usually means it\'s a fake site.</p>');
			else if (groupData['group'] === "image")
				show_feedback_message(next_url, '<p dir="ltr">This site is not safe! You should have noticed that walla-shops.com is different than the original domain wallashops.co.il. When a site name includes a hyphen (-), this usually means it\'s a fake site. Moreover, the safe login process with the 4 images was missing. This means that the site is not in the list of Trusted Sites. The black V icon (<img src="' + black_v + '">) indicates that the site isn\'t in the list of Trusted Sites. The green V (<img src="' + green_v + '">) indicates that the site is in the list of Trusted Sites.</p>');
			else if (groupData['group'] === "button")
				show_feedback_message(next_url, '<p dir="ltr">This site is not safe! You should have noticed that walla-shops.com is different than the original domain wallashops.co.il. When a site name includes a hyphen (-), this usually means it\'s a fake site. Moreover, before logging in you should always click the Shark-King V icon. If the site is in the list of Trusted Sites, you will see a message stating that the site is safe. When you clicked the Shark-King V icon, did you see a message stating that the site is safe (example below)? <br><br><img style="width:75%; height:65%;" src="' + secure_button + '"><br> The black V icon (<img src="' + black_v + '">) indicates that the site isn\'t in the list of Trusted Sites. The green V (<img src="' + green_v + '">) indicates that the site is in the list of Trusted Sites.</p>');
		}
		else if ("https://www.linkedin.com/start/join?trk=login_reg_redirect&session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fpeople%2Fpymk%2Fhub%3Fref%3Dglobal-nav%26trk%3Dnav_utilities_invites_header".indexOf(normalizeURL(url)) > -1){
			if (groupData['group'] === "feedback")
				show_feedback_message(next_url, '<p dir="ltr">This site is safe! You should have noticed that www.linkedin.com is a safe domain. It\'s very important to compare the site name and the actual URL.</p>');
			else if (groupData['group'] === "image")
				show_feedback_message(next_url, '<p dir="ltr">This site is safe! You should have noticed that www.linkedin.com is a safe domain. It\'s very important to compare the site name and the actual URL.<br><br>Moreover, did you notice the green V icon (<img src="' + green_v + '">) and the safe login process with the 4 images (example below)? <br><br><img style="height:50%;width:90%;" src="' + secure_images + '"><br>When a site is in the list of Trusted Sites, before logging in you will always see the image selection process, requiring you to select your correct unique image. This process should have helped you decide that this site is safe.</p>');
			else if (groupData['group'] === "button")
				show_feedback_message(next_url, '<p dir="ltr">This site is safe! You should have noticed that www.linkedin.com is a safe domain. It\'s very important to compare the site name and the actual URL.<br><br>Moreover, before logging in, you should click the green V icon (<img src="' + green_v + '">). If the site is in the list of Trusted Sites, you will see a message that indicates that the site is safe. Did you notice the green V icon (<img src="' + green_v + '">) and the message that is displayed when you click on it (example below)? <br><br><img style="height:50%;width:90%;" src="' + secure_button + '"><br>This process should have helped you decide that this site is safe.</p>');
		}
		else if ("https://login.microsoftonline.com/login.srf?wa=wsignin1.0&rpsnv=4&ct=1464676725&rver=6.7.6640.0&wp=MCMBI&wreply=https%3a%2f%2fportal.office.com%2flanding.aspx%3ftarget%3d%252fHome&lc=1033&id=501392&msafed=0&client-request-id=e1cf9c30-8fd4-4983-91ae-c94619d8e689".indexOf(normalizeURL(url)) > -1){
			if (groupData['group'] === "feedback")
				show_feedback_message(next_url, '<p dir="ltr">This site is safe! You should have noticed that login.microsoftonline.com is a safe domain. It\'s very important to compare the site name and the actual URL.</p>');
			else if (groupData['group'] === "image")
				show_feedback_message(next_url, '<p dir="ltr">This site is safe! You should have noticed that login.microsoftonline.com is a safe domain. It\'s very important to compare the site name and the actual URL.<br><br>Moreover, did you notice the green V icon (<img src="' + green_v + '">) and the safe login process with the 4 images (example below)? <br><br><img style="height:50%;width:90%;" src="' + secure_images + '"><br>When a site is in the list of Trusted Sites, before logging in you will always see the image selection process, requiring you to select your correct unique image. This process should have helped you decide that this site is safe.</p>');
			else if (groupData['group'] === "button")
				show_feedback_message(next_url, '<p dir="ltr">This site is safe! You should have noticed that login.microsoftonline.com is a safe domain. It\'s very important to compare the site name and the actual URL.<br><br>Moreover, before logging in, you should click the green V icon (<img src="' + green_v + '">). If the site is in the list of Trusted Sites, you will see a message that indicates that the site is safe. Did you notice the green V icon (<img src="' + green_v + '">) and the message that is displayed when you click on it (example below)? <br><br><img style="height:50%;width:90%;" src="' + secure_button + '"><br>This process should have helped you decide that this site is safe.</p>');
		}
		else if ("https://friends.walla.co.il/#/login".indexOf(normalizeURL(url)) > -1){
			if (groupData['group'] === "feedback")
				show_feedback_message(next_url, '<p dir="ltr">This site is safe! You should have noticed that friends.walla.co.il is a safe domain, because it belongs to walla.co.il.</p>');
			else if (groupData['group'] === "image")
				show_feedback_message(next_url, '<p dir="ltr">This site is safe! You should have noticed that friends.walla.co.il is a safe domain, because it belongs to walla.co.il.<br><br>Moreover, did you notice the green V icon (<img src="' + green_v + '">) and the safe login process with the 4 images (example below)? <br><br><img style="height:50%;width:90%;" src="' + secure_images + '"><br>When a site is in the list of Trusted Sites, before logging in you will always see the image selection process, requiring you to select your correct unique image. This process should have helped you decide that this site is safe.</p>');
			else if (groupData['group'] === "button")
				show_feedback_message(next_url, '<p dir="ltr">This site is safe! You should have noticed that friends.walla.co.il is a safe domain, because it belongs to walla.co.il.<br><br>Moreover, before logging in, you should click the green V icon (<img src="' + green_v + '">). If the site is in the list of Trusted Sites, you will see a message that indicates that the site is safe. Did you notice the green V icon (<img src="' + green_v + '">) and the message that is displayed when you click on it (example below)? <br><br><img style="height:50%;width:90%;" src="' + secure_button + '"><br>This process should have helped you decide that this site is safe.</p>');
		}
	}
}

// long and hard-coded function for transferring user from one site to the next in initial phase
function next_site(url, choice){
	// make sure user didn't access this page while surfing the web
	if(!settings['init_done']){
		// each "if" simply sees what is the current URL, registers user's choice for this URL, and transfers user to next URL
		if ("https://login-facebok.com/login.php/next=www.facebook.com.html".indexOf(normalizeURL(url)) > -1){
			if(choice === "safe")
				safe_wrong(url, 'test');
			else if (choice === "unsafe")
				unsafe_right(url, 'test');
			else if (choice === "dont_know")
				dont_know(url, 'test');
			window.location.href = "https://banklogin.club/Hapoalim/bankhapoalim/Israel/ssl=1/";
		}
		else if (url === "https://banklogin.club/Hapoalim/bankhapoalim/Israel/ssl=1/"){
			if(choice === "safe")
				safe_wrong(url, 'test');
			else if (choice === "unsafe")
				unsafe_right(url, 'test');
			else if (choice === "dont_know")
				dont_know(url, 'test');
			var next_url = "https://www.torrentday.com/login.php?returnto=%2F";
			// delete cookies before "real" sites, so no info is displayed there
			chrome.runtime.sendMessage({method:'delete_cookies', url: next_url});
			window.location.href = next_url;
		}
		else if ("https://www.torrentday.com/login.php?returnto=%2F".indexOf(normalizeURL(url)) > -1){
			if(choice === "safe")
				safe_right(url, 'test');
			else if (choice === "unsafe")
				unsafe_wrong(url, false ,'test');
			else if (choice === "dont_know")
				dont_know(url, false ,'test');
			window.location.href = "https://pypal.website/signin/country.x=IL/locale.x=en_IL/";
		}
		else if ("https://pypal.website/signin/country.x=IL/locale.x=en_IL/".indexOf(normalizeURL(url)) > -1){
			if(choice === "safe")
				safe_wrong(url, 'test');
			else if (choice === "unsafe")
				unsafe_right(url, 'test');
			else if (choice === "dont_know")
				dont_know(url, 'test');
			var next_url = "https://www.adikastyle.com/customer/account/login/referer/aHR0cDovL3d3dy5hZGlrYXN0eWxlLmNvbS8,/";
			chrome.runtime.sendMessage({method:'delete_cookies', url: next_url});
			window.location.href = next_url;
		}
		else if ("https://www.adikastyle.com/customer/account/login/referer/aHR0cDovL3d3dy5hZGlrYXN0eWxlLmNvbS8,/".indexOf(normalizeURL(url)) > -1){
			if(choice === "safe")
				safe_right(url, 'test');
			else if (choice === "unsafe")
				unsafe_wrong(url, 'test');
			else if (choice === "dont_know")
				dont_know(url, 'test');
			var next_url = "http://www.bgu4u.co.il/members/login.aspx";
			chrome.runtime.sendMessage({method:'delete_cookies', url: next_url});
			window.location.href = next_url;
		}
		else if ("http://www.bgu4u.co.il/members/login.aspx".indexOf(normalizeURL(url)) > -1){
			if(choice === "safe")
				safe_right(url, 'test');
			else if (choice === "unsafe")
				unsafe_wrong(url, 'test');
			else if (choice === "dont_know")
				dont_know(url, 'test');
			var next_url = "https://online.bankotsar.co.il/wps/portal/";
			chrome.runtime.sendMessage({method:'delete_cookies', url: next_url});
			window.location.href = next_url;
		}
		else if ("https://online.bankotsar.co.il/wps/portal/".indexOf(normalizeURL(url)) > -1){
			if(choice === "safe")
				safe_right(url, 'test');
			else if (choice === "unsafe")
				unsafe_wrong(url, 'test');
			else if (choice === "dont_know")
				dont_know(url, 'test');
			window.location.href = "https://login-gamil.com/accounts.google.com/ServiceLogin=mail/service=mail//passive=true/rm=false/continue=https:/mail.google.com/mail/ss=1/scc=1/ltmpl=default/ltmplcache=2/";
		}
		else if ("https://login-gamil.com/accounts.google.com/ServiceLogin=mail/service=mail//passive=true/rm=false/continue=https:/mail.google.com/mail/ss=1/scc=1/ltmpl=default/ltmplcache=2/#identifier".indexOf(normalizeURL(url)) > -1){
			if(choice === "safe")
				safe_wrong(url, 'test');
			else if (choice === "unsafe")
				unsafe_right(url, 'test');
			else if (choice === "dont_know")
				dont_know(url, 'test');
			window.location.href = "https://bankleumi.club/uniquesig4e0824291ffbe1b42058d6558ed87217/uniquesig0/InternalSite/CustomUpdate/eBank_ULI_Login.asp/resource_id=6381D2C2DE2C4DAFB2F73FB654339DA7/login_type=2/";
		}
		else if ("https://bankleumi.club/uniquesig4e0824291ffbe1b42058d6558ed87217/uniquesig0/InternalSite/CustomUpdate/eBank_ULI_Login.asp/resource_id=6381D2C2DE2C4DAFB2F73FB654339DA7/login_type=2/".indexOf(normalizeURL(url)) > -1){
			if(choice === "safe")
				safe_wrong(url, 'test');
			else if (choice === "unsafe")
				unsafe_right(url, 'test');
			else if (choice === "dont_know")
				dont_know(url, 'test');
			var next_url = "https://www.pinterest.com/login/?referrer=home_page";
			chrome.runtime.sendMessage({method:'delete_cookies', url: next_url});
			window.location.href = next_url;
		}
		else if ("https://www.pinterest.com/login/?referrer=home_page".indexOf(normalizeURL(url)) > -1){
			if(choice === "safe")
				safe_right(url, 'test');
			else if (choice === "unsafe")
				unsafe_wrong(url, 'test');
			else if (choice === "dont_know")
				dont_know(url, 'test');
			// this is the last URL for this list, either go to training phase, or complete initial phase (depending on phishing group)
			if(groupData['phishing_number'] === 0)
				window.location.href = (settings['lang'] === 0) ? chrome.extension.getURL("html/post_explanation_eng.html") : chrome.extension.getURL("html/post_explanation_heb.html");
			else if (groupData['phishing_number'] === 1)
				window.location.href = (settings['lang'] === 0) ? chrome.extension.getURL("html/init_done_eng.html") : chrome.extension.getURL("html/init_done_heb.html");
		}
		else if ("https://www.facebok-secure.com/login.php/facebook.com/".indexOf(normalizeURL(url)) > -1){
			if(choice === "safe")
				safe_wrong(url, 'test');
			else if (choice === "unsafe")
				unsafe_right(url, 'test');
			else if (choice === "dont_know")
				dont_know(url, 'test');
			var next_url = "https://passport.dx.com/?redirect=http%3A%2F%2Fwww.dx.com%2F%3Fredirect%3Dhttp%3A%2F%2Fwww.dx.com%2F";
			chrome.runtime.sendMessage({method:'delete_cookies', url: next_url});
			window.location.href = next_url;
		}
		else if ("https://passport.dx.com/?redirect=http%3A%2F%2Fwww.dx.com%2F%3Fredirect%3Dhttp%3A%2F%2Fwww.dx.com%2F".indexOf(normalizeURL(url)) > -1){
			if(choice === "safe")
				safe_right(url, 'test');
			else if (choice === "unsafe")
				unsafe_wrong(url, 'test');
			else if (choice === "dont_know")
				dont_know(url, 'test');
			var next_url = "https://login.yahoo.com/?.src=ym&.intl=us&.lang=en-US&.done=https%3a//mail.yahoo.com";
			chrome.runtime.sendMessage({method:'delete_cookies', url: next_url});
			window.location.href = next_url;
		}
		else if ("https://login.yahoo.com/?.src=ym&.intl=us&.lang=en-US&.done=https%3a//mail.yahoo.com".indexOf(normalizeURL(url)) > -1){
			if(choice === "safe")
				safe_right(url, 'test');
			else if (choice === "unsafe")
				unsafe_wrong(url, 'test');
			else if (choice === "dont_know")
				dont_know(url, 'test');
			window.location.href = "http://lemida.co/login/biu/";
		}
		else if ("http://lemida.co/login/biu/".indexOf(normalizeURL(url)) > -1){
			if(choice === "safe")
				safe_wrong(url, 'test');
			else if (choice === "unsafe")
				unsafe_right(url, 'test');
			else if (choice === "dont_know")
				dont_know(url, 'test');
			window.location.href = "https://www.eday.tech/ws/eBayISAPI.dll/SignIn/UsingSSL=1/pUserId=2/co_partnerId=2/siteid=0/ru=my.ebay.com/eBayISAPI.dll/FMyEbayBeta/26MyEbay/gbh/guest3D1/pageType=3984/";
		}
		else if ("https://www.eday.tech/ws/eBayISAPI.dll/SignIn/UsingSSL=1/pUserId=2/co_partnerId=2/siteid=0/ru=my.ebay.com/eBayISAPI.dll/FMyEbayBeta/26MyEbay/gbh/guest3D1/pageType=3984/".indexOf(normalizeURL(url)) > -1){
			if(choice === "safe")
				safe_wrong(url, 'test');
			else if (choice === "unsafe")
				unsafe_right(url, 'test');
			else if (choice === "dont_know")
				dont_know(url, 'test');
			window.location.href = "https://www.wallashops.co/israel/shops/online/";
		}
		else if ("https://www.wallashops.co/israel/shops/online/".indexOf(normalizeURL(url)) > -1){
			if(choice === "safe")
				safe_wrong(url, 'test');
			else if (choice === "unsafe")
				unsafe_right(url, 'test');
			else if (choice === "dont_know")
				dont_know(url, 'test');
			var next_url = "https://sso.compassmanager.com/login?service=https%3a%2f%2fomsfba.compassmanager.com%2ffmp";
			chrome.runtime.sendMessage({method:'delete_cookies', url: next_url});
			window.location.href = next_url;
		}
		else if ("https://sso.compassmanager.com/login?service=https%3a%2f%2fomsfba.compassmanager.com%2ffmp".indexOf(normalizeURL(url)) > -1){
			if(choice === "safe")
				safe_right(url, 'test');
			else if (choice === "unsafe")
				unsafe_wrong(url, 'test');
			else if (choice === "dont_know")
				dont_know(url, 'test');
			window.location.href = "https://banklogin.club/sc.mizrahi-tefahot.co.il/TFHLogin/index.html#/login";
		}
		else if (url === "https://banklogin.club/sc.mizrahi-tefahot.co.il/TFHLogin/index.html#/login"){
			if(choice === "safe")
				safe_wrong(url, 'test');
			else if (choice === "unsafe")
				unsafe_right(url, 'test');
			else if (choice === "dont_know")
				dont_know(url, 'test');
			var next_url = "http://lemida.biu.ac.il/login/index.php";
			chrome.runtime.sendMessage({method:'delete_cookies', url: next_url});
			window.location.href = next_url;
		}
		else if ("http://lemida.biu.ac.il/login/index.php".indexOf(normalizeURL(url)) > -1){
			if(choice === "safe")
				safe_right(url, 'test');
			else if (choice === "unsafe")
				unsafe_wrong(url, 'test');
			else if (choice === "dont_know")
				dont_know(url, 'test');
			var next_url = "https://www.hot.net.il/heb/SelfService/Login/";
			chrome.runtime.sendMessage({method:'delete_cookies', url: next_url});
			window.location.href = next_url;
		}
		else if ("https://www.hot.net.il/heb/SelfService/Login/".indexOf(normalizeURL(url)) > -1){
			if(choice === "safe")
				safe_right(url, 'test');
			else if (choice === "unsafe")
				unsafe_wrong(url, 'test');
			else if (choice === "dont_know")
				dont_know(url, 'test');
			// this is the last URL for this list, either go to training phase, or complete initial phase (depending on phishing group)
			if(groupData['phishing_number'] === 0)
				window.location.href = (settings['lang'] === 0) ? chrome.extension.getURL("html/init_done_eng.html") : chrome.extension.getURL("html/init_done_heb.html");
			else if (groupData['phishing_number'] === 1)
				window.location.href = (settings['lang'] === 0) ? chrome.extension.getURL("html/post_explanation_eng.html") : chrome.extension.getURL("html/post_explanation_heb.html");
		}
		// in training URLs we also show feedback, so we don't transfer user clicks "got it"
		else if ("https://www.linkedin.com/start/join?trk=login_reg_redirect&session_redirect=https%3A%2F%2Fwww.linkedin.com%2Fpeople%2Fpymk%2Fhub%3Fref%3Dglobal-nav%26trk%3Dnav_utilities_invites_header".indexOf(normalizeURL(url)) > -1){
			var next_url = "https://facebok-com.com/facebook/u3nmekvgn2/login.html";
			if(choice === "safe")
				safe_right(url, 'train', next_url);
			else if (choice === "unsafe")
				unsafe_wrong(url, 'train', next_url);
			else if (choice === "dont_know")
				dont_know(url, 'train', next_url);
		}
		else if ("https://facebok-com.com/facebook/u3nmekvgn2/login.html".indexOf(normalizeURL(url)) > -1){
			var next_url = "https://login.microsoftonline.com/login.srf?wa=wsignin1.0&rpsnv=4&ct=1464676725&rver=6.7.6640.0&wp=MCMBI&wreply=https%3a%2f%2fportal.office.com%2flanding.aspx%3ftarget%3d%252fHome&lc=1033&id=501392&msafed=0&client-request-id=e1cf9c30-8fd4-4983-91ae-c94619d8e689";
			if(choice === "safe")
				safe_wrong(url, 'train', next_url);
			else if (choice === "unsafe")
				unsafe_right(url, 'train', next_url);
			else if (choice === "dont_know")
				dont_know(url, 'train', next_url);
			chrome.runtime.sendMessage({method:'delete_cookies', url: next_url});
		}
		else if ("https://login.microsoftonline.com/login.srf?wa=wsignin1.0&rpsnv=4&ct=1464676725&rver=6.7.6640.0&wp=MCMBI&wreply=https%3a%2f%2fportal.office.com%2flanding.aspx%3ftarget%3d%252fHome&lc=1033&id=501392&msafed=0&client-request-id=e1cf9c30-8fd4-4983-91ae-c94619d8e689".indexOf(normalizeURL(url)) > -1){
			var next_url = "https://secure-gamil.com/";
			if(choice === "safe")
				safe_right(url, 'train', next_url);
			else if (choice === "unsafe")
				unsafe_wrong(url, 'train', next_url);
			else if (choice === "dont_know")
				dont_know(url, 'train', next_url);
		}
		else if ("https://secure-gamil.com/#identifier".indexOf(normalizeURL(url)) > -1){
			var next_url = "https://friends.walla.co.il/#/login";
			if(choice === "safe")
				safe_wrong(url, 'train', next_url);
			else if (choice === "unsafe")
				unsafe_right(url, 'train', next_url);
			else if (choice === "dont_know")
				dont_know(url, 'train', next_url);
			chrome.runtime.sendMessage({method:'delete_cookies', url: next_url});
		}
		else if ("https://friends.walla.co.il/#/login".indexOf(normalizeURL(url)) > -1){
			var next_url = "https://walla-shops.com/Login/Online/";
			if(choice === "safe")
				safe_right(url, 'train', next_url);
			else if (choice === "unsafe")
				unsafe_wrong(url, 'train', next_url);
			else if (choice === "dont_know")
				dont_know(url, 'train', next_url);
		}
		else if ("https://walla-shops.com/Login/Online/".indexOf(normalizeURL(url)) > -1){
			var next_url = chrome.extension.getURL("html/before_final_test.html");
			if(choice === "safe")
				safe_wrong(url, 'train', next_url);
			else if (choice === "unsafe")
				unsafe_right(url, 'train', next_url);
			else if (choice === "dont_know")
				dont_know(url, 'train', next_url);
			// training phase is done
			chrome.runtime.sendMessage({method:'in_training_false'});
		}
		else{
			alert("There seems to be a problem with the test. Please close and re-open your browser, and try again.");
		}
	}
}

// display message for "button" group when user tried using secure process for page that isn't in whitelist
function button_message (){
	var second_dialog = false;
	// create dialog string
	var dialog = $("<p dir='ltr'>It seems like you just tried to use the safe login process, however this site is not in your list of Trusted Sites!<br><br>Please let us know your reason for clicking the Shark-King icon.</p>");
	// set dialog properties
	var dialogProperties = {
		autoOpen:false,
		modal: false,
		resizable: false,
		closeOnEscape: false, 
		title: '<img src="' + black_v + '" /> Shark-King',
		open: function(event, ui) { 
			$(".ui-dialog-titlebar-close", ui.dialog | ui).hide(); 
			$('.ui-button-text').css('white-space', 'normal');
			$('.ui-dialog').css('z-index', 6000);
			$('.ui-dialog').css('text-align', 'left');
		},
		close: function(event, ui) { 
			if(second_dialog){
				var obj = fakeSiteData['fake_domains'];
				var original_url;
				var is_fake = false;
				for (var original in obj) {
					if (obj.hasOwnProperty(original) && obj[original].indexOf(window.location.href) > -1) {
						original_url = original;
						is_fake = true;
						break;
					}
				}
				if(is_fake)
					showNotification("Great job! This site is a phishing site. Notice that Shark-King did not display the safe login message!");
				else
					showNotification("This site is not part of our experiment, but it may still be a suspect site (notice that Shark-King did not display the safe login message).");
			}
		}
	};
	// set dialog buttons
	dialogProperties.buttons =  {
		// update server with user's choice
		"I thought it was a Trusted Site, and wanted to use the safe login process":
		function() {
			var $this = $(this);
			second_dialog = true;
			logAction('double_button_message', 'thought_site_was_trusted', 'maybe_phishing');
			$this.dialog("close");
		},
		"Relax, I just wanted to open the Shark-King menu":  
		function() {
			var $this = $(this);
			logAction('double_button_message', 'just_opened_menu', 'no_problem');
			$this.dialog("close");
		}
	}
	dialog.dialog(dialogProperties).dialog("open");
	var maxWidth = Math.max.apply(null, $(".ui-button").map( function () {
		return $( this ).outerWidth( true );
	}).get() );
	var maxHeight = Math.max.apply(null, $(".ui-button").map( function () {
		return $( this ).outerHeight( true );
	}).get() );
	maxHeight = maxHeight + 10;
	maxWidth = maxWidth - 10;
	$(".ui-button").css({"width" : ""+maxWidth+""});
	$(".ui-button").css({"height" : ""+maxHeight+""});
	$('.ui-dialog :button').blur();
}

// display message for "button" group when user clicked "don't know" during tests
function dont_know_message (url){
	var message_shown = false;
	// cancel body alert
	$('body').off('click');
	// clear page so jquery dialog will always work without styling issues
	document.body.innerHTML = "";
	// create dialog string
	var dialog = $("<p dir='ltr'>Please click on the appropriate reason for not knowing.</p>");
	// set dialog properties
	var dialogProperties = {
		autoOpen:false,
		modal: false,
		closeOnEscape: false,
		title: '<img src="' + black_v + '" /> Shark-King',
		position: { my: "center", at: "center", of: window },
		open: function(event, ui) { 
			$(".ui-dialog-titlebar-close", ui.dialog | ui).hide(); 
			$('.ui-button-text').css('white-space', 'normal');
			$('.ui-dialog-content,.ui-widget-content').css('overflow', 'initial');
			$('.ui-dialog-content,.ui-widget-content').css('text-align', 'left');
			$('.ui-dialog').css('z-index', 6000);
			$('.ui-dialog').css('font-family', 'Arial');
			$('.ui-dialog').css('font-size', '14px');
		}
	};
	// set dialog buttons
	dialogProperties.buttons =  {
		// update server with user's choice
		"I don't know this website":
		function() {
			var $this = $(this);
			logAction('dont_know_message', 'didnt_know_website', '');
			next_site(url, "dont_know");
			$this.dialog("close");
		},
		"I know this website, but couldn't determine if it's fake or not":  
		function() {
			var $this = $(this);
			logAction('dont_know_message', 'knows_website', 'cant_determine');
			next_site(url, "dont_know");
			$this.dialog("close");
		}
	}
	dialog.dialog(dialogProperties).dialog("open");
	var maxWidth = Math.max.apply(null, $(".ui-button").map( function () {
		return $( this ).outerWidth( true );
	}).get() );
	var maxHeight = Math.max.apply(null, $(".ui-button").map( function () {
		return $( this ).outerHeight( true );
	}).get() );
	maxHeight = maxHeight + 10;
	maxWidth = maxWidth - 10;
	$(".ui-button").css({"width" : ""+maxWidth+""});
	$(".ui-button").css({"height" : ""+maxHeight+""});
	$('.ui-dialog :button').blur();
}

// show dialog when user clicks "Test Me" on menu
function test_me(){
	// create dialog string
	var dialog = $("<p dir='ltr'>Training Mode - a phishing attack will be launched against you during the next 24 hours.<br><br>Please confirm.</p>");
	// set dialog properties
	var dialogProperties = {
		autoOpen:false,
		modal: false,
		closeOnEscape: false, 
		title: '<img src="' + black_v + '" /> Shark-King',
		open: function(event, ui) { 
			$(".ui-dialog-titlebar-close", ui.dialog | ui).hide(); 
			$('.ui-button-text').css('white-space', 'normal');
			$('.ui-dialog').css('z-index', 6000);
			$('.ui-dialog').css('font-family', 'Arial');
			$('.ui-dialog').css('font-size', '14px');
		}
	};
	// set dialog buttons
	dialogProperties.buttons =  {
		// activate training mode - let "background.js" know, and update server
		"Activate Training Mode":
		function() {
			var $this = $(this);
			chrome.runtime.sendMessage({method:'initiateAttack'});
			logAction('clicked_test_me', 'activated_training_mode', 'update');
			$this.dialog("close");
		},
		// cancel - update server and do nothing
		"Cancel":  
		function() {
			var $this = $(this);
			logAction('clicked_test_me', 'canceled_training_mode', 'update');
			$this.dialog("close");
		}
	}
	// open dialog
	dialog.dialog(dialogProperties).dialog("open");
	var maxWidth = Math.max.apply(null, $(".ui-button").map( function () {
		return $( this ).outerWidth( true );
	}).get() );
	var maxHeight = Math.max.apply(null, $(".ui-button").map( function () {
		return $( this ).outerHeight( true );
	}).get() );
	maxHeight = maxHeight + 10;
	maxWidth = maxWidth - 10;
	$(".ui-button").css({"width" : ""+maxWidth+""});
	$(".ui-button").css({"height" : ""+maxHeight+""});
	$('.ui-dialog :button').blur();
}

// this dialog is displayed when user in "button" group clicks page and buttons are disabled
function button_protection(){
	// set dialog string and image
	var url = chrome.extension.getURL('images/button_protection.png');
	var dialog = $('<p dir="ltr">For security reasons, you must use the safe login process by opening the Shark-King menu.<br><br><img src="' + url + '"; style="height:80%; width: 80%;"></p>');
	// set dialog properties
	var dialogProperties = {
		autoOpen:false,
		modal: false,
		closeOnEscape: false,
		title: '<span style="float:left"><img style="float:left; padding-right:5px" src="' + black_v + '" />Shark-King</span>',
		open: function(event, ui) { 
			// cancel body alert (until message is closed)
			$('body').off('click');
			setTimeout(function(){dialog.dialog('close');}, 6000);
			$('.ui-dialog').css('z-index', 6000);
			$('.ui-dialog').css('font-family', 'Arial');
			$('.ui-dialog').css('font-size', '14px');
		},
		// on close, rehook the listener on body (only if the hook wasn't disabled already by opening the menu)
		close: function(event, ui) { 
			chrome.runtime.sendMessage({method:'get_disabled'}, function(response){
				if (response.disabled){
					$('body').off().on('click', function() {
						button_protection();
					});
				}
			});
		}
	};
	// open dialog
	dialog.dialog(dialogProperties).dialog("open");
	$('.ui-dialog :button').blur();
}


// displays feedback during the training phase
function show_feedback_message (next_url, content){
	// create dialog string
	var dialog = $(content);
	// set dialog properties
	var dialogProperties = {
		autoOpen:false,
		modal: false,
		resizable: false,
		width: 400,
		closeOnEscape: false,
		title: '<img src="' + black_v + '" /> Shark-King',
		open: function(event, ui) { 
			$(".ui-dialog-titlebar-close", ui.dialog | ui).hide(); 
			$('.ui-button-text').css('white-space', 'normal');
			$('.ui-dialog').css('z-index', 6000);
			$('.ui-dialog').css('font-family', 'Arial');
			$('.ui-dialog').css('font-size', '14px');
		}
	};
	// set dialog button
	dialogProperties.buttons =  {
		// clicking this button will forward user to next site in the training phase
		"Got it, thanks!":
		function() {
			var $this = $(this);
			window.location.href = next_url;
			$this.dialog("close");
		}
	}
	dialog.dialog(dialogProperties).dialog("open");
	$('.ui-dialog :button').blur();
}


// used for decoding the fake login pages
var Base64 = {
    _keyStr: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
    encode: function(input) {
        var output = "";
        var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
        var i = 0;
        input = Base64._utf8_encode(input);
        while (i < input.length) {
            chr1 = input.charCodeAt(i++);
            chr2 = input.charCodeAt(i++);
            chr3 = input.charCodeAt(i++);
            enc1 = chr1 >> 2;
            enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
            enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
            enc4 = chr3 & 63;
            if (isNaN(chr2)) {
                enc3 = enc4 = 64;
            } else if (isNaN(chr3)) {
                enc4 = 64;
            }
            output = output + this._keyStr.charAt(enc1) + this._keyStr.charAt(enc2) + this._keyStr.charAt(enc3) + this._keyStr.charAt(enc4);
        }
        return output;
    },
    decode: function(input) {
        var output = "";
        var chr1, chr2, chr3;
        var enc1, enc2, enc3, enc4;
        var i = 0;
        input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
        while (i < input.length) {
            enc1 = this._keyStr.indexOf(input.charAt(i++));
            enc2 = this._keyStr.indexOf(input.charAt(i++));
            enc3 = this._keyStr.indexOf(input.charAt(i++));
            enc4 = this._keyStr.indexOf(input.charAt(i++));
            chr1 = (enc1 << 2) | (enc2 >> 4);
            chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
            chr3 = ((enc3 & 3) << 6) | enc4;
            output = output + String.fromCharCode(chr1);
            if (enc3 != 64) {
                output = output + String.fromCharCode(chr2);
            }
            if (enc4 != 64) {
                output = output + String.fromCharCode(chr3);
            }
        }
		decoded = true;
        output = Base64._utf8_decode(output);
        return output;
    },
    _utf8_encode: function(string) {
        string = string.replace(/\r\n/g, "\n");
        var utftext = "";
        for (var n = 0; n < string.length; n++) {
            var c = string.charCodeAt(n);
            if (c < 128) {
                utftext += String.fromCharCode(c);
            }
            else if ((c > 127) && (c < 2048)) {
                utftext += String.fromCharCode((c >> 6) | 192);
                utftext += String.fromCharCode((c & 63) | 128);
            }
            else {
                utftext += String.fromCharCode((c >> 12) | 224);
                utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                utftext += String.fromCharCode((c & 63) | 128);
            }
        }
        return utftext;
    },
    _utf8_decode: function(utftext) {
        var string = "";
        var i = 0;
        var c = c1 = c2 = 0;
        while (i < utftext.length) {
            c = utftext.charCodeAt(i);
            if (c < 128) {
                string += String.fromCharCode(c);
                i++;
            }
            else if ((c > 191) && (c < 224)) {
                c2 = utftext.charCodeAt(i + 1);
                string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
                i += 2;
            }
            else {
                c2 = utftext.charCodeAt(i + 1);
                c3 = utftext.charCodeAt(i + 2);
                string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
                i += 3;
            }
        }
        return string;
    }
}