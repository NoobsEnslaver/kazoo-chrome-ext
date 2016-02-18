/* 
 Copyright 2013, BroadSoft, Inc.

 Licensed under the Apache License,Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0
 
 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "ASIS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */

var MODULE = "background.js";
var KAZOO = {};

function logout()
{
    localStorage["connectionStatus"] = "signedOut";
    chrome.browserAction.setIcon({path: "images/logo_offline_128x128.png"});
}

function onMessage(request, sender, sendResponse) {
    var type = request.type;
    if (type == "CALL") {
	var destination = request.text.replace(/[- \(\)\.]/g, "");
	var status = "ok";
	try {
	    if (!localStorage["history"]) {
		localStorage["history"] = JSON.stringify([]);
	    }
	    var history = JSON.parse(localStorage["history"]);
	    history.push({
		number: destination,
		time: Date.now(),
		type: "outgoing",
		name: ""});
	    localStorage["history"] = JSON.stringify(history);

	    LOGGER.API.log(MODULE, "calling: " + destination);
	    if (localStorage["active_device"] && localStorage["active_device"] != "") {
		KAZOO.device.quickcall({
		number: destination,
		account_id: localStorage["account_id"],
		deviceId: localStorage["active_device"]});
	    }else{
		KAZOO.user.quickcall({
		number: destination,
		account_id: localStorage["account_id"],
		userId: localStorage["user_id"]});
	    }

	} catch (error) {
	    status = "error";
	    LOGGER.API.log(MODULE, "Exception in 'OnMessage': " + error);
	}
	sendResponse({
	    status : status
	});
    } else if (type == "IS_CLICK_TO_DIAL_ENABLED") {
	sendResponse({
	    status : localStorage["clicktodial"]
	});
    }else if (type == "BG_RESTART") {
	contentLoaded();
    }
}

function updateDevices(){
    KAZOO.device.list({account_id: localStorage["account_id"], success: function(data, status){
	var devices = [];
	var x = data.data;
	for(var p in x) {
	    devices.push({
		num: p,
		name: x[p].name,
		id: x[p].id
	    });
	};
	localStorage["devices"] = JSON.stringify(devices);
	
	localStorage["active_device"] = (localStorage["active_device"] && x[localStorage["active_device"]])? localStorage["active_device"]: "";
    }});
};

function contentLoaded() {
    localStorage["restartRequired"] = "false";

    if (!(localStorage["url"] && localStorage["username"] && localStorage["accname"] && localStorage["credentials"])) return;
    
    var kazoosdk_options = {
	apiRoot: localStorage["url"],

	onRequestStart: function(request, requestOptions) {
	    LOGGER.API.log(MODULE,"Request started: " + request);
	},
	onRequestEnd: function(request, requestOptions) {
	    LOGGER.API.log(MODULE,"Request ended: " + request);
	},
	onRequestError: function(error, requestOptions) {
	    if(requestOptions.generateError !== false) {
		LOGGER.API.log(MODULE,"Request error: " + error.status + " " + error.status.text);
	    }
	    logout();
	}
    };
    KAZOO = $.getKazooSdk(kazoosdk_options);
    
    function authorize(){
	KAZOO.auth.userAuth({
	    data: {
		account_name: localStorage["accname"],
		method: "md5",
		credentials: localStorage["credentials"]
	    },
	    success: function(data, status) {
		localStorage["account_id"] = data.data.account_id;
		localStorage["user_id"] = data.data.owner_id;
		KAZOO.account.get({
		    account_id: data.data.account_id,
		    success: function(data, status) {
			chrome.browserAction.setIcon({path: "images/logo_online_128x128.png"});
			LOGGER.API.log(MODULE,"Auth completed, user name: " + data.data.name);		    
			localStorage["name"] = data.data.name;
			localStorage["connectionStatus"] = "signedIn";
			updateDevices();
		    },
		    error: function(data, status) {
			showMessage("Invalid credentials. Please verify the information is correct and try again.");
			console.log('Error data:', data.data);
			LOGGER.API.error(MODULE, data.data);
			chrome.browserAction.setIcon({path: "images/logo_offline_128x128.png"});
			localStorage["connectionStatus"]= "offline";
			localStorage["restartRequired"] = "false";
			localStorage["errorMessage"] = data.data;
		    },
		    generateError: true
		});
	    }
	});}
    authorize();
    window.setInterval(authorize, 60*60*1000); // update auth-token every hour

}

chrome.extension.onMessage.addListener(onMessage);
document.addEventListener('DOMContentLoaded', contentLoaded);
