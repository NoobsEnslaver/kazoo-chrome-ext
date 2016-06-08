(function(){
	if (localStorage["connectionStatus"] != "signedIn") {
		chrome.tabs.update({url: chrome.extension.getURL("sign.html")});
	}

	function main(){
		$("#send_btn").click(send);
		localize();
	}

	function localize(){
		var dictionary = storage.get("localization", {});

		$("#title").text(dictionary["fax_send"].message);
		$("#attachment").attr("placeholder", dictionary["attachment_url"].message);
		$("#first_name").attr("placeholder", dictionary["first_name"].message);
		$("#to_phone").attr("placeholder", dictionary["to_phone"].message);
		$("#from_phone").attr("placeholder", dictionary["from_phone"].message);
		$("#send_btn").attr("value", dictionary["send"].message);
		$("#reset_btn").attr("value", dictionary["reset"].message);
	}

	function send(){
		var options = $('form[name=Options]').serializeArray().reduce((obj, item)=>{
			obj[item.name] = item.value;
			return obj;
		}, {type: "SEND_FAX" });
		chrome.runtime.sendMessage(options, (e)=>{});
	}

	document.addEventListener("DOMContentLoaded", main);
})();
