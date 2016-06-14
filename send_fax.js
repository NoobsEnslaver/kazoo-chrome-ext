(function(){
	if (localStorage["connectionStatus"] != "signedIn") {
		chrome.tabs.update({url: chrome.extension.getURL("sign.html")});
	}

	function main(){
		createDropdownMenu();
		$("#send_btn").click(send);
		localize();
	}

	function createDropdownMenu(){
		var select  = $("#caller_id")[0];
		var accountOpt = document.createElement("option");
		accountOpt.value = "account";
		accountOpt.text = "Account: " + localStorage["account_external_caller_name"]; // TODO: test it, external || internal?
		accountOpt.disabled = !("account_external_caller_name" in localStorage);

		var userOpt = document.createElement("option");
		userOpt.value = "user";
		userOpt.text = "User: " + localStorage["user_external_caller_name"];  // TODO: test it, external || internal?
		userOpt.disabled = !("user_external_caller_name" in localStorage);

		storage.get("devices", []).forEach((device)=>{
			var deviceOpt = document.createElement("option");
			deviceOpt.value = device.num;
			deviceOpt.text = device.name + " (" + device.external_caller_name + ")";
			deviceOpt.disabled = !(device.external_caller_name && device.external_caller_number);  // TODO: test it, external || internal?
			select.add(deviceOpt);
		});
		
		select.add(accountOpt);
		select.add(userOpt);
	}

	function localize(){
		var dictionary = storage.get("localization", {});

		$("#title").text(dictionary["fax_send"].message);
		$("#attachment").attr("placeholder", dictionary["attachment_url"].message);
		$("#to_name").attr("placeholder", dictionary["to_name"].message);
		$("#to_number").attr("placeholder", dictionary["to_number"].message);
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
