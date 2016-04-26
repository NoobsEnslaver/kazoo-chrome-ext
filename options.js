var signStatus = localStorage["connectionStatus"] != "signedIn";

if (signStatus) {
	chrome.browserAction.setPopup({popup: "options.html"});
	var urlSign = chrome.extension.getURL("sign.html"), kostSign = false;

	chrome.tabs.query({}, function(tabs) {
		$.each(tabs, function(i, tab) {
			if (tab.url == urlSign) {
				kostSign = tab.id;
				return false;
			}
		});

		if (kostSign === false) {
			chrome.tabs.create({url: chrome.extension.getURL("sign.html")});
		} else {
			chrome.tabs.update(kostSign, {active: true});
		}

		window.close();
	});
} else {
	chrome.browserAction.setPopup({popup: "tabs.html"});
}