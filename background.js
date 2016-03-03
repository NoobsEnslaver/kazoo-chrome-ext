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
	switch (type){
	case "CALL":
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
		break;
		
	case "IS_CLICK_TO_DIAL_ENABLED":
		sendResponse({
			status : localStorage["clicktodial"]
		});
		break;

	case "BG_RESTART":
		contentLoaded();		
		break;

	case "UPDATE_LOCALIZATION":
		updateLocalization();
		break;

	case "UPDATE_PHONE_BOOK":
		updatePhoneBook();
		break;

	case "CREATE_PHONE_BOOK":
		createPhoneBook();
		break;

	case "PHONE_BOOK_ADD_ENTRY":
		phoneBookAddEntry(request.name, request.phone);
		break;

	case "PHONE_BOOK_REMOVE_ENTRY":
		phoneBookRemoveEntry(request.entry_id);
		break;
	}
}

function phoneBookAddEntry(name, phone){
	if (name.length > 0 && phone.length > 0) {
		var list_id =JSON.parse(localStorage["phone_book"])[0].value.list_id;
		KAZOO.lists.addEntry({account_id: localStorage["account_id"],
				      success: updatePhoneBook,
				      list_id: list_id,
				      data:{ name: name, phone: phone }
				     });
	}
}

function updateLocalization(){
	localStorage["lang"] = (localStorage["lang"] && localStorage["lang"].length == 2)?
		localStorage["lang"]:
		chrome.i18n.getUILanguage().substring(0, 2);
	var lang = localStorage["lang"];

	var a = $.getJSON("_locales/" + lang + "/messages.json").	//have problem with messaging with callbacks.
		    done( (x)=> { localStorage["localization"] = JSON.stringify(x); }).
		    fail( ( )=> { localStorage["localization"] = JSON.stringify({ "appName":{message: chrome.i18n.getMessage("appName")},
										  "appDesc":{message: chrome.i18n.getMessage("appDesc")},
										  "signin_label":{message: chrome.i18n.getMessage("signin_label")},
										  "url":{message: chrome.i18n.getMessage("url")},
										  "accname":{message: chrome.i18n.getMessage("accname")},
										  "username":{message: chrome.i18n.getMessage("username")},
										  "password":{message: chrome.i18n.getMessage("password")},
										  "signin":{message: chrome.i18n.getMessage("signin")},
										  "about":{message: chrome.i18n.getMessage("about")},
										  "signout_text":{message: chrome.i18n.getMessage("signout_text")},
										  "call_tab":{message: chrome.i18n.getMessage("call_tab")},
										  "history_tab":{message: chrome.i18n.getMessage("history_tab")},
										  "pref_tab":{message: chrome.i18n.getMessage("pref_tab")},
										  "phone_num":{message: chrome.i18n.getMessage("phone_num")},
										  "clicktodialbox":{message: chrome.i18n.getMessage("clicktodialbox")},
										  "notificationsbox":{message: chrome.i18n.getMessage("notificationsbox")},
										  "texttospeechbox":{message: chrome.i18n.getMessage("texttospeechbox")},
										  "any_phone":{message: chrome.i18n.getMessage("any_phone")},
										  "robutton":{message: chrome.i18n.getMessage("robutton")},
										  "cfabutton":{message: chrome.i18n.getMessage("cfabutton")},
										  "dndbutton":{message: chrome.i18n.getMessage("dndbutton")}
										});});
}

function phoneBookRemoveEntry(entry_id){
	var list_id =JSON.parse(localStorage["phone_book"])[0].value.list_id;
	KAZOO.lists.deleteEntry({account_id: localStorage["account_id"],
				 success: updatePhoneBook,
				 list_id: list_id,
				 entry_id: entry_id
				});
}

function createPhoneBook(){
	KAZOO.lists.addList({account_id: localStorage["account_id"],
			     success: updatePhoneBook,
			     data:{ name: "Phone book" }});
}

function updatePhoneBook(){
	KAZOO.lists.getLists({account_id: localStorage["account_id"], success: (data, status)=>{
		var phone_book = data.data.find((x)=>{return ( x.name == "Phone book");});
		if (phone_book) {
			KAZOO.lists.getEntries({account_id: localStorage["account_id"], list_id: phone_book.id, success:(d, s)=>{
				localStorage["phone_book"] = JSON.stringify(d.data);
			}});
		}else{
			localStorage["phone_book"] = localStorage["phone_book"]? localStorage["phone_book"]: "NONE";
		}
	}});
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
	updateLocalization();
	if (!(localStorage["url"] && localStorage["username"] && localStorage["accname"] && localStorage["credentials"])){
		chrome.browserAction.setIcon({path: "images/logo_offline_128x128.png"});
		return;
	}

	var kazoosdk_options = {
		apiRoot: localStorage["url"] + "v2/",

		onRequestStart: function(request, requestOptions) {
			//LOGGER.API.log(MODULE,"Request started: " + JSON.stringify(request));
		},
		onRequestEnd: function(request, requestOptions) {
			//LOGGER.API.log(MODULE,"Request ended: " + JSON.stringify(request));
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
					localStorage["authTokens"] = KAZOO.authTokens[Object.keys(KAZOO.authTokens)[0]];
					updateDevices();
					updateVoiceMails();
					updatePhoneBook();

					window.setInterval(authorize, 60*60*1000); // update auth-token every hour	
					window.setInterval(updateVoiceMails, 30*1000);
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

	contentLoaded();
}

function updateVoiceMails(){
	KAZOO.voicemail.list({
		filters: { filter_owner_id: localStorage["user_id"] },
		account_id: localStorage["account_id"],
		success: (data, status)=> {
			data.data.map((box)=>{
				KAZOO.voicemail.get({
					account_id: localStorage["account_id"],
					voicemailId: box.id,
					success: (box_data, box_status)=> {
						var msg_list;
						try{
							msg_list = JSON.parse(localStorage["vm_media"]);
						}catch(e){
							msg_list = {};
						}

						msg_list[box.id] = box_data.data;
						localStorage["vm_media"] = JSON.stringify(msg_list);
					}
				});
			});

			var box_list;
			try{
				box_list = JSON.parse(localStorage["vm_boxes"]);
			}catch(e){
				box_list = [];
			}

			var new_msg = substract(data.data.map(
				(x)=>{x.old = true; return x;}), box_list).map(
					(x)=>{x.old = false; return x;});

			localStorage["vm_boxes"] = JSON.stringify( box_list.concat(new_msg) );
			if (new_msg.length > 0) {
				chrome.browserAction.setIcon({path: "images/mail_ico256.png"});
			}
		}});
}


function substract(a, b)
{
	var c = a.map(JSON.stringify);
	var d = b.map(JSON.stringify);	
	var res = c.filter((n)=>{ return !d.includes(n);});

	return res.map(JSON.parse);
}

chrome.extension.onMessage.addListener(onMessage);
document.addEventListener('DOMContentLoaded', ()=>{contentLoaded();});
