/* 
 * This script runs in "post_explanation.html" for users
 * in "image" group - shows images and enables upload etc.
 */

// get access to "background.js"
var backgroundPage = chrome.extension.getBackgroundPage();
var correctImagePath;
// initialization function handles showing of image collection and upload buttons etc
init();
function init () {
	// get all cell elements
	var cellNode = document.getElementsByClassName('cell')[0];
	var parent = cellNode.parentNode;
	var imagesCount = 10;
	// iterate through cells and dislay images
	for (var i = 0; i < imagesCount; i++) {
		var image = cellNode.getElementsByTagName('img')[0];
		image.onclick = onImageClick;
		var strIndex = ("0" + (i + 1)).slice(-2);
		image.src = "../images/image" + strIndex + ".png";
		parent.appendChild(cellNode);
		cellNode = cellNode.cloneNode(true);
	};
	// create form for uploading images to server
	var form = document.getElementById('imageform');
	form.action = backgroundPage.settings['data_url'] + 'upload?id=' + backgroundPage.user_id;
	// create buttons for uploading images
	var button = document.getElementsByName('sendbutton')[0];
	button.onclick = onSendClick;
	// when images are uploaded:
	$('#imageform').on('submit',(function(e) {
        e.preventDefault();
		// get extensions of images
		var ext1 = $("#correct").val().split('.').pop();
		var ext2 = $("#other1").val().split('.').pop();
		var ext3 = $("#other2").val().split('.').pop();
		var ext4 = $("#other3").val().split('.').pop();
		// extensions must be "jpg"
		if (ext1 !== "jpg" || ext2 !== "jpg" || ext3 !== "jpg" || ext4 !== "jpg"){
			alert("You must upload 4 .jpg files (case sensitivity applies, so please change 'JPG' to 'jpg'.");
			return;
		}
		// set form request information
        var formData = new FormData(this);
        $.ajax({
            type:'POST',
            url: $(this).attr('action'),
            data:formData,
            cache:false,
            contentType: false,
            processData: false,
			// when iamges are uploaded successfully to server
            success: function(data){
				// let user know
				alert("Images uploaded successfully! Please read the new instructions below.");
				// update server
        		chrome.runtime.sendMessage({method: 'logAction', action: 'user_uploaded_images', data: 'personal', hostname: 'init_setup'});
				// hide irrelevant elements and show new section
		        $('#image_after_selection').css('display', '');
				$('#button_feedback_image').css('display', '');
				$('#images').css('display', 'none');
				// disable form after uploading images
				var form = document.getElementById("imageform");
				var elements = form.elements;
				for (var i = 0, len = elements.length; i < len; ++i) {
					elements[i].disabled = true;
				}
			}
        });
    }));
}

// when user selects iamge and clicks on it
function onImageClick (e) {
	// get its path
	correctImagePath = e.target.src;
	// get index of image selected
	var match = /(\d{2})/.exec(correctImagePath);
	var index = Math.floor(match[1]);
	// update server with correct image index
	chrome.runtime.sendMessage({method: 'logAction', action: 'right_image', data: index, hostname: "init_setup"});
	// set correct image path in settings (store locally)
	chrome.runtime.sendMessage({method: 'set', key: 'rightImagePath', value: correctImagePath});
	// hide irrelevant elements and show new section
    $('#image_after_selection').css('display', '');
	$('#button_feedback_image').css('display', '');
	$('#images').css('display', 'none');
	// disable form after selecting image
	var form = document.getElementById("imageform");
	var elements = form.elements;
	for (var i = 0, len = elements.length; i < len; ++i) {
		elements[i].disabled = true;
	}
	// let user know
	alert("Image selected! Please move on to the Training Phase below.");
}

// when user uploads image
function onSendClick() {
	// if another image was already selected, return
	if (correctImagePath) {
		chrome.runtime.sendMessage({method: 'set', key: 'rightImagePath', value: correctImagePath});
		return;
	}
	// update server
	chrome.runtime.sendMessage({method: 'logAction', action: 'right_image', data: 'own', hostname: "init_setup"});
	// get selected images for upload
	var inputs = [
		document.getElementsByName('correct')[0],
		document.getElementsByName('other1')[0],
		document.getElementsByName('other2')[0],
		document.getElementsByName('other3')[0],
	];
	// set correct image path locally
	chrome.runtime.sendMessage({method: 'set', key: 'rightImagePath', value: backgroundPage.settings['imagesPath'] + 'correct.jpg'});
}