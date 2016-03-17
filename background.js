/* 
Copyright 2016, SIPLABS LLC.	
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
				name: ""
			});
			localStorage["history"] = JSON.stringify(history);

			LOGGER.API.log(MODULE, "calling: " + destination);
			if (localStorage["active_device"] && localStorage["active_device"] != "" && localStorage["active_device"] != "any_phone") {
				KAZOO.device.quickcall({
					number: destination,
					account_id: localStorage["account_id"],
					deviceId: localStorage["active_device"]
				});
			}else{
				KAZOO.user.quickcall({
					number: destination,
					account_id: localStorage["account_id"],
					userId: localStorage["user_id"]
				});
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
	KAZOO.device.list({
		account_id: localStorage["account_id"],
		success: (data, status)=>{
			var new_devices = [];
			var devices = data.data;
			for(var device_num in devices) {
				new_devices.push({
					num: device_num,
					name: devices[device_num].name,
					id: devices[device_num].id
				});
			};
			localStorage["devices"] = JSON.stringify(new_devices);

			localStorage["active_device"] = (localStorage["active_device"] && devices[localStorage["active_device"]])? localStorage["active_device"]: "";
		}});
};


function contentLoaded() {
	if (!(localStorage["url"] && localStorage["username"] && localStorage["accname"] && localStorage["credentials"])){
		chrome.browserAction.setIcon({path: "images/logo_offline_128x128.png"});
		return;
	}

	var kazoosdk_options = {
		apiRoot: localStorage["url"] + "v2/",

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
			var error_count = incrementErrorCount(error.status);

			if (error.status == "401"){
				if (error_count < 3) {
					window.setTimeout(authorize, 1000);
				}
			}

			 showError(error);
		}
	};
	KAZOO = $.getKazooSdk(kazoosdk_options);

	authorize();
	window.setInterval(authorize, 30*60*1000); // update auth-token every 30m
}

function incrementErrorCount(error_code){
	var errors = {};
	try{
		errors = JSON.parse(localStorage["errors"]);
	}catch(e){}
	errors[error_code] = (errors[error_code] + 1) || 1;
	errors["last_modify"] = Date.now();
	window.setTimeout(()=>{
		if (! localStorage["errors"]) return;
		var errors = JSON.parse(localStorage["errors"]);
		if (Date.now() - errors["last_modify"] >= 5000) {
			localStorage.removeItem('errors');
		}
	}, 5000);
	localStorage["errors"] = JSON.stringify(errors[error_code]);
	return errors[error_code];
}

function showError(data){
	chrome.runtime.sendMessage({
		sender: "KAZOO",
		type: "error",
		data: data
	}, ()=>{});
}

function authorize(){
	localStorage["connectionStatus"] = "inProgress";
	chrome.browserAction.setIcon({path: "images/logo_wait_128x128.gif"});
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
					LOGGER.API.log(MODULE,"Auth completed, account name: " + data.data.name);
					chrome.browserAction.setIcon({path: "images/logo_online_128x128.png"});
					localStorage["name"] = data.data.name;
					localStorage["connectionStatus"] = "signedIn";
					localStorage["errorMessage"]="";
					updateDevices();
				},
				error: error_handler
			});
		},
		error: error_handler,
		generateError: true
	});}

function error_handler(data, status){
	LOGGER.API.error(MODULE, status.error);
	chrome.browserAction.setIcon({path: "images/logo_offline_128x128.png"});
	localStorage["connectionStatus"]= "authFailed";
	localStorage.removeItem('credentials');
	localStorage["errorMessage"] = status.responseText;
}

chrome.extension.onMessage.addListener(onMessage);
document.addEventListener('DOMContentLoaded', ()=>{contentLoaded();});
