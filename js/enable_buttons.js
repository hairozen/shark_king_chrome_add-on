// re-enable all buttons for "button" group, and disable special alert on body
$("input[type=button]").removeAttr("disabled");
$("input[type=submit]").removeAttr("disabled");
$("button").removeAttr("disabled");
$('body').off('click');