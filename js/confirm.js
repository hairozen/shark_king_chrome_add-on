/* 
 * This script runs in the context of "confirm.html" - 
 * the page that displays the 4 pictures for a user in the
 * "image" group
*/

var imageChoice = null, oldChoice = null;
// "backgroundPage" has access to all variables/functions of "background.js"
var backgroundPage = chrome.extension.getBackgroundPage();
// get settings from "background.js"
var settings = backgroundPage.settings;
// start initial function
init();

// initial setting up of images on page, setting correct image, attack, etc.
function init () {
	var personal_attack, attack;
	// set function for "back" button click
    document.getElementById("back").onclick = onBack;
	// write the current (whitelisted) site on page ("you are about to visit a trusted site: X")
    document.getElementById("trusted").textContent = normalizeURL(settings['pendingURL']);
	// get the correct image path (set by "init.js" in "post_explanation.html")
    var rightImagePath = settings['rightImagePath'];
	else if (rightImagePath.indexOf("correct") > -1)
		personal_attack = true;
	else
		personal_attack = false;
	// with 10% probability - launch appropriate attack
	if (backgroundPage.mode > 0 && Math.random() < 0.1)
		attack = personal_attack ? 'personalImage' : 'noRightImage';
	// get image elements on "confirm.html" (we want to fill them with actual sources)
    var images = document.getElementsByTagName('img');
	// "indices" will represent the names/indices of the images (filenames are numbers)
    var indices = [];
    var imagesCount = 10;
	// iterate through all 10 images and add all except correct image to "indices" list
    for (var i = 0; i < imagesCount; i++) {
        if (!rightImagePath.endsWith((i+1) + ".png"))
            indices.push(i);
    };
	// create random index for correct image
    var rightIndex = Math.floor(Math.random() * images.length);
	// make room for the correct image index
    indices.splice(rightIndex, 1);
	// create random index for personal image (for attack)
    var personalIndex = Math.floor(Math.random() * images.length);
	// make room for the personal image index
    indices.splice(personalIndex, 1);
	// iterate through images
    for (var i = images.length - 1; i >= 0; i--) {
		// set function for image click
        images[i].onclick = onImageClick;
		// when we reach correct image index, mark it as "right"
        if (i === rightIndex) {
            images[i].className = "right";
			// if we do indeed have a "correct" image, set its source
            if (attack !== 'noRightImage') {
                images[i].src = rightImagePath;
                continue;
            }
			// let server know that attack was actually launched
			else
				chrome.runtime.sendMessage({method: 'logAction', action: 'noRightImage_launch', data: 'good', hostname: 'luck'});
        }
		// for all other images
        else {
			// set as "wrong"
            images[i].className = "wrong";
			// if we're in the personal image attack, and reached the personal image
            if (i === personalIndex && attack === 'personalImage') {
				// set source image from personal images on server
                var rightIndex = Math.floor(Math.random() * 3);
                images[i].src = settings['imagesPath'] + rightIndex + '.jpg';
				// let server know that attack was actually launched
				chrome.runtime.sendMessage({method: 'logAction', action: 'personalImage_launch', data: 'good', hostname: 'luck'});
                continue;
            };
        }
		// create random index
        var randomIndex = Math.floor(Math.random() * indices.length);
		// create image index from general indices
        var imageIndex = indices.splice(randomIndex, 1)[0] + 1;
		// create string for filename
        var strIndex = ("0" + imageIndex).slice(-2);
		// set source for images
        images[i].src = "../images/image" + strIndex + ".png";
    };
	// add user ID parameter to all sources
    for (var i = images.length - 1; i >= 0; i--) {
        images[i].src += "?id=" + backgroundPage.user_id;
    };
}

// this function runs when user clicks on correct image and is forwarded onwards
function onContinue (e) {
	// get the pending URL (for forwarding)
    chrome.runtime.sendMessage({method: 'get', key: 'pendingURL'}, function (response) {
        var pendingURL = response.pendingURL;
		// let "background.js" know that it can ignore this URL (let user go there without a problem)
        chrome.runtime.sendMessage({method: 'set', key: 'ignore', value: pendingURL});
		// if user was right, add "forwarding" to message
		var forwarding = imageChoice==='right' ? '<br><br> Forwarding...' : '';
		// set message according to user's choice
		var dialogMessage = "You've chosen the " + imageChoice + " image! " + forwarding;
		// if user was wrong
		if (imageChoice === 'wrong' && settings['attack'] !== 'noRightImage') {
			// define message
			dialogMessage += " The right image is highlighted in red. <br><br>You must select the correct image in order to login safely.";
			// get right image element
			var rightImage = document.getElementsByClassName('right')[0];
			var rightDiv = rightImage.parentNode.parentNode;
			// mark right image for user
			rightDiv.style.border = '5px solid red';
		};
		// define actual dialog for displaying message
		var dialog = $("<p>" + dialogMessage + "</p>");
		var black_v = chrome.extension.getURL('icons/icon19.png');
		dialog.dialog({
			autoOpen:false,
			modal: false,
			closeOnEscape: false,
			title: '<img src="' + black_v + '" /> Shark-King',
			open: function(event, ui) { 
				setTimeout(function(){dialog.dialog('close'); if (imageChoice === 'right') {window.location.assign(pendingURL);};}, 4000);
				$(".ui-dialog-titlebar").css("background", imageChoice === 'right' ? "green" : "red");
				$('.ui-dialog').css('z-index', 6000);
				$('.ui-dialog').css('font-family', 'Arial');
				$('.ui-dialog').css('font-size', '14px');
			},
		})
		// open dialog
		.dialog('open');
		// set "choice" variable for update to server
		choice = imageChoice === 'right' ? 'continueTrue' : 'continueFalse';
		// update server about user's choice
        chrome.runtime.sendMessage({method: 'logAction', action: 'image_process_choice', data: choice, hostname: new URL(pendingURL).hostname});
		// if the "noRightImage" attack is active, update the server with user's choice and register outcome
        if (settings['attack'] === 'noRightImage') {
            chrome.runtime.sendMessage({method: 'logAction', action: 'noRightImage_choice', data: choice, hostname: new URL(pendingURL).hostname});
            chrome.runtime.sendMessage({method: 'registerOutcome', success: false, feedback: ["There are no right images in this training.", null]});
        } 
		// if the personal image attack is active, update the server with user's choice and register outcome
		else if (settings['attack'] === 'personalImage') {
            chrome.runtime.sendMessage({method: 'logAction', action: 'personalImage_choice', data: choice, hostname: new URL(pendingURL).hostname});
            chrome.runtime.sendMessage({
				method: 'registerOutcome', 
				success: choice === 'continueTrue', 
				feedback: ["You've chosen the wrong image!", "We tried to trick you, but you have chosen the correct image, good job!"]
            });
        };
    });
}

// what happens when user clicks "back" instead of on one of the images
function onBack (e) {
	// get the previous URL
    chrome.runtime.sendMessage({method: 'get', key: 'currentUrl'}, function (response) {
		// update server of user's click, and send user back to previous page
		var currentUrl = response.currentUrl;
        chrome.runtime.sendMessage({method: 'set', key: 'ignore', value: currentUrl});
        chrome.runtime.sendMessage({method: 'logAction', action: 'image_process_choice', data: 'back', hostname: new URL(currentUrl).hostname});
		window.location.assign(currentUrl);
	});
}

// what happens on image click
function onImageClick (e) {
	// set boolean flag - did user click correct image?
	var right = e.target.className === 'right';
	// on first click, this is null. but if user first clicked wrong image, mark old choice as well
    if (oldChoice) {
        oldChoice.style.border = "solid";
    };
	// define previous user's choice
    var div = e.target.parentNode.parentNode;
	oldChoice = div;
	// mark image as selected
    div.style.border = "5px solid yellow";
	// if the "noRightImage" attack is active, user's wrong. else, define if "right" or "wrong"
	imageChoice = settings['attack'] === 'noRightImage' ? 'wrong' : e.target.className;
	// forward user to wanted page
    onContinue();
}

// auxiliary function for cleaning up URL (only protocol with 3 first elements, e.g. "https://www.google.com/")
function normalizeURL(url) {
    var urlParts = url.split('/');
    urlParts = urlParts.slice(0, 3).concat([""]);
    return urlParts.join('/');
}

function showNotification (message) {
	// create notification string
	var dialog = $("<p dir='ltr'>" + message + "</p>");
	// set dialog properties
	var black_v = chrome.extension.getURL('icons/icon19.png');
	dialog.dialog({
		autoOpen:false,
		modal: false,
		closeOnEscape: false,
		title: '<img src="' + black_v + '" /> Shark-King',
		open: function(event, ui) { 
			setTimeout(function(){dialog.dialog('close');}, 4000);
			$('.ui-dialog').css('z-index', 6000);
			$('.ui-dialog').css('font-family', 'Arial');
			$('.ui-dialog').css('font-size', '14px');
		},
	// open dialog
	}).dialog('open');
	$('.ui-dialog :button').blur();
}

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
	if (message.method === 'showNotification')
		showNotification(message.message);
});