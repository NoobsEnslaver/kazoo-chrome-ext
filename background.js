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
var SOCKET = {};
var AUTH_DAEMON_ID;
var VM_DAEMON_ID;

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

	case "IS_ON_CALL_NOTIFICATION_ENABLED":
		if (localStorage.callNotificationsEnabled) {
			sendResponse();
		}
		break;

	case "BG_RESTART":
		KAZOO = {};
		SOCKET = {};
		clearInterval(AUTH_DAEMON_ID);
		clearInterval(VM_DAEMON_ID);
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
		sendResponse("");
		phoneBookAddEntry(request.name, request.phone);
		break;

	case "PHONE_BOOK_REMOVE_ENTRY":
		phoneBookRemoveEntry(request.entry_id);
		break;

	case "SWITCH_DND":
		switchDND();
		break;
	}
}

function phoneBookAddEntry(name, phone){
	if (name.length > 0 && phone.length > 0 && localStorage["phoneBookListId"]) {
		var list_id = localStorage["phoneBookListId"];
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
										  "enter_connection":{message: chrome.i18n.getMessage("enter_connection")},
										  "choose_connection":{message: chrome.i18n.getMessage("choose_connection")},
										  "new_connection":{message: chrome.i18n.getMessage("new_connection")},
										  "url":{message: chrome.i18n.getMessage("url")},
										  "lang":{message: chrome.i18n.getMessage("lang")},
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
	if(!localStorage["phoneBookListId"]) return;
	var list_id = localStorage["phoneBookListId"];
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

function switchDND(){
	KAZOO.user.get({userId: localStorage['user_id'], account_id: localStorage['account_id'],
			success: (data, status)=>{
				if(!(data.data.do_not_disturb && data.data.do_not_disturb.enabled)){
					data.data.do_not_disturb = {enabled: false};
				}
				data.data.do_not_disturb.enabled = !data.data.do_not_disturb.enabled;
				KAZOO.user.update({data: data.data, userId: localStorage['user_id'], account_id: localStorage['account_id'],success:(a,b)=>{}});
				localStorage.dnd = !data.data.do_not_disturb.enabled;
			}});
}

function updatePhoneBook(){
	KAZOO.lists.getLists({account_id: localStorage["account_id"], success: (data, status)=>{
		var phone_book = data.data.find((x)=>{return ( x.name == "Phone book");});
		if (phone_book) {
			localStorage["phoneBookListId"] = phone_book.id;
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
	}catch(e){
		LOGGER.API.log(MODULE, "Can't parse localStorage[\"errors\"] = " + localStorage["errors"]);
	}
	errors[error_code] = errors[error_code] || 0;
	errors[error_code] += 1;
	errors["last_modify"] = Date.now();
	window.setTimeout(()=>{
		if (! localStorage["errors"]) return;
		var errors = JSON.parse(localStorage["errors"]);
		if (Date.now() - errors["last_modify"] >= 5000) {
			delete(localStorage.errors);
		}
	}, 5000);
	localStorage["errors"] = JSON.stringify(errors);
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
					signToBlackholeEvents();

					AUTH_DAEMON_ID = window.setInterval(authorize, 60*60*1000); // update auth-token every hour
					VM_DAEMON_ID = window.setInterval(updateVoiceMails, 30*1000);

				},
				error: error_handler
			});
		},
		error: error_handler,
		generateError: true
	});}

function signToBlackholeEvents(){
	if (!(io && io.connect)) return;

	var blackholeUrl = localStorage.url.replace(/:[0-9]+/, ":5555");
	SOCKET = io.connect(blackholeUrl);
	SOCKET.emit('subscribe', {
		account_id: localStorage.account_id,
		auth_token: localStorage.authTokens,
		binding: 'call.*.*'
        });

	function resender(EventJObj) {
		console.log(EventJObj);
		chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
			chrome.tabs.sendMessage(tabs[0].id, {
				sender: "KAZOO",
				type: "event",
				data: EventJObj
			}, (event)=>{
				console.log(event);
				switch(event.type){
				case "REDIRECT_TO_VOICEMAIL":
					// TODO
					break;

				case "DO_NOTHING":
					break;

				default:
					showError({statusText: "Cannot execute command", status: ""});
					LOGGER.API.log(MODULE, "Unknown event-type from content-script: " +  event.type);
				}
			});
		});
	}

	SOCKET.on('CHANNEL_CREATE', resender);
	SOCKET.on('CHANNEL_ANSWER', resender);
        SOCKET.on('CHANNEL_DESTROY', resender);
}




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
						if (!localStorage["vm_media"]) {
							localStorage["vm_media"] = JSON.stringify({});
						}
						try{
							msg_list = JSON.parse(localStorage["vm_media"]);
						}catch(e){
							LOGGER.API.log(MODULE, "Can't parse localStorage[\"vm_media\"] = " +  localStorage["vm_media"]);
							msg_list = {};
						}
						msg_list[box.id] = box_data.data;
						localStorage["vm_media"] = JSON.stringify(msg_list);
					}
				});
			});

			var box_list;
			if(!localStorage["vm_boxes"]){
				localStorage["vm_boxes"] = JSON.stringify([]);
			}
			try{
				box_list = JSON.parse(localStorage["vm_boxes"]);
			}catch(e){
				LOGGER.API.log(MODULE, "Can't parse localStorage[\"vm_boxes\"] = " + localStorage["vm_boxes"]);
				box_list = [];
			}

			var new_boxes = data.data.map((x_new)=>{
				x_new.old = true;
				try{
					var new_message_received = (box_list.filter((x_old)=>{return (x_new.id == x_old.id);})[0].messages < x_new.messages);
					if (new_message_received) {
						x_new.old = false;
						chrome.browserAction.setIcon({path: "images/mail_ico256.png"});
					}
				}catch(e){
					x_new.old = false;
				}
				return x_new;
			});
			localStorage["vm_boxes"] = JSON.stringify(new_boxes);
		}});
}


function substract(a, b){
	var c = a.map(JSON.stringify);
	var d = b.map(JSON.stringify);
	var res = c.filter((n)=>{ return !d.includes(n);});

	return res.map(JSON.parse);
}

chrome.extension.onMessage.addListener(onMessage);
document.addEventListener('DOMContentLoaded', ()=>{contentLoaded();});
chrome.contextMenus.create({
	onclick: (a,b)=>{
		var text = a.selectionText;
		var international = "(([+]?)([0-9][0-9]?)((\\.|-| )([0-9]{1,3}))((\\.|-| )([0-9]{1,4})){2,4})";
		var us = "((([2-9][0-8][0-9])|([\(][2-9][0-8][0-9][\)]))(\\.|-| )?([2-9][0-9]{2})(\\.|-| )?([0-9]{4}))";
		var re = new RegExp();
		re.compile("(" + us + "|" + international + ")");

		var localization;
		try{
			localization = JSON.parse(localStorage["localization"]);
		}catch(e){
			LOGGER.API.log(MODULE, "Localization error.");
		};

		var phone = text.match(re);
		if (phone) {
			var name = prompt(localization.get_owner_name.message + " " +phone[0], localization.anonymous.message);
			if (name) {
				phoneBookAddEntry(name, phone[0]);
			}
		} else {
			alert(localization.cant_parse_number.message + " :(");
		}
	},
	id: "add_phone",
	title:"Add to phonebook",
	contexts: ["selection"]
});
