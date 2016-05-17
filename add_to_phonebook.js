if (localStorage["connectionStatus"] != "signedIn") {
	chrome.tabs.update({url: chrome.extension.getURL("sign.html")});
}

function main(){
	$("#save_btn").click(save_options);
	localize();
}

function localize(){
	var dictionary = storage.get("localization", {});

	$("#title").text(dictionary["pb_title"].message);
	$("#info").text(dictionary["info"].message);
	$("#first_name").attr("placeholder", dictionary["first_name"].message);
	$("#last_name").attr("placeholder", dictionary["last_name"].message);
	$("#birthday").attr("placeholder", dictionary["birthday"].message);
	$("#phone").attr("placeholder", dictionary["tel"].message);
	$("#email").attr("placeholder", dictionary["email"].message);
	$("#address").attr("placeholder", dictionary["address"].message);
	$("#save_btn").attr("value", dictionary["save"].message);
	$("#reset_btn").attr("value", dictionary["reset"].message);
}

function save_options(){
	var options = $('form[name=Options]').serializeArray().reduce((obj, item)=>{
		obj[item.name] = item.value;
		return obj;
	}, {type: "PHONE_BOOK_ADD_ENTRY"});	
	chrome.runtime.sendMessage(options, (e)=>{});
}

document.addEventListener("DOMContentLoaded", main);
