/*
 Copyright 2016, SIPLABS LLC.

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
		if(is_too_fast("last_call_time", 3000)) return;
		var destination = request.text.replace(/[- \)\(\.]/g, "");
		console.log(MODULE + " calling: " + destination);
		if (localStorage["active_device"] && localStorage["active_device"] != "" && localStorage["active_device"] != "auto") {
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

		sendResponse({
			status : "ok"
		});
		break;

	case "IS_CLICK_TO_DIAL_ENABLED":
		sendResponse({
			status : localStorage["clicktodial"]
		});
		break;

	case "BG_RESTART":
		bg_restart();
		break;

	case "UPDATE_LOCALIZATION":
		updateLocalization();
		sendResponse();
		break;

	case "UPDATE_PHONE_BOOK":
		updatePhoneBook();
		break;

	case "PHONE_BOOK_ADD_ENTRY":
		//sendResponse("");
		delete request["type"];
		phoneBookAddEntry(request);
		break;

	case "PHONE_BOOK_REMOVE_ENTRY":
		phoneBookRemoveEntry(request.entry_id);
		break;

	case "SWITCH_DND":
		switchDND();
		break;


	case "BLACKHOLE_USER_ACTION":
		blackholeUserActionHandler(request.data);
		break;

	case "VOICE_MAIL_DELETE_ENTRY":
		voiceMailDeleteEntryHandler(request.data);
		break;

	case "GENTLY_OPEN_PAGE":
		gentlyOpenPage(request.url);
		break;

	case "SEND_FAX":
		send_fax(request);
		break;
	}
}

function send_fax(request){
	var name = request.name;
	var phone = request.phone;
	var attachment = request.attachment;	// FIXME: no data received

	var data = {
		"document":{
			"url": attachment,
			"method":"get"
		},
		"retries":1,
		"to_name": name,
		"to_number": phone,
		"from_number": localStorage["fax_caller_id"],
		"from_name": localStorage["fax_caller_name"]

	};
	KAZOO.faxes.send({account_id: localStorage.account_id, data: data});
}

function update_fax(){
	if(is_too_fast()) return;
	KAZOO.faxbox.list({account_id: localStorage["account_id"], filters: { filter_owner_id: localStorage["user_id"] }, success: (data, status)=>{
		if (data.data.length > 0) {
			localStorage["fax_id"] = data.data[0].id;
			localStorage["fax_smtp_email_address"] = data.data[0]["fax_smtp_email_address"];
			localStorage["fax_caller_id"] = data.data[0]["caller_id"];
			localStorage["fax_caller_name"] = data.data[0]["caller_name"];
			localStorage["fax_media"] = data.data[0]["media"];	//FIXME
		}else{
			//createFaxBox();	//TODO
		}
	}, error: (data, status)=>{
		console.log("Update phoneBook error, code %o", status.status);
	}});	
}

function voiceMailDeleteEntryHandler(data){
	if(is_too_fast()) return;
	KAZOO.voicemail.delete({
		account_id: localStorage["account_id"],
		voicemailId: data.vmbox_id,
		msg_id: data.media_id,
		success: (x)=>{}
	});
}

function phoneBookAddEntry(request){
	if ((request.name.length > 0 || request.last_name.length > 0) && request.phone.length > 0 && localStorage["phoneBookListId"]) {
		KAZOO.lists.addEntry({account_id: localStorage["account_id"],
				      success: updatePhoneBook,
				      list_id: localStorage["phoneBookListId"], 
				      data: request
				     });
	}
}

function updateLocalization(){
	localStorage["lang"] = (localStorage["lang"] && localStorage["lang"].length == 2)?
		localStorage["lang"]:
		chrome.i18n.getUILanguage().substring(0, 2);
	var lang = localStorage["lang"];

	var a = $.getJSON("_locales/" + lang + "/messages.json").
		    done( (x)=> { localStorage["localization"] = JSON.stringify(x); }).
		    fail( ( )=> { localStorage["localization"] = JSON.stringify({ "appName":{message: chrome.i18n.getMessage("appName")},
										  "appDesc":{message: chrome.i18n.getMessage("appDesc")},
										  "signin_label":{message: chrome.i18n.getMessage("signin_label")},
										  "enter_connection":{message: chrome.i18n.getMessage("enter_connection")},
										  "choose_connection":{message: chrome.i18n.getMessage("choose_connection")},
										  "new_connection":{message: chrome.i18n.getMessage("new_connection")},
										  "url":{message: chrome.i18n.getMessage("url")},
										  "lang":{message: chrome.i18n.getMessage("lang")},
										  "info":{message: chrome.i18n.getMessage("info")},
										  "first_name":{message: chrome.i18n.getMessage("first_name")},
										  "last_name":{message: chrome.i18n.getMessage("last_name")},
										  "birthday":{message: chrome.i18n.getMessage("birthday")},
										  "tel":{message: chrome.i18n.getMessage("tel")},
										  "email":{message: chrome.i18n.getMessage("email")},
										  "address":{message: chrome.i18n.getMessage("address")},
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
	if(is_too_fast()) return;
	var list_id = localStorage["phoneBookListId"];
	KAZOO.lists.deleteEntry({account_id: localStorage["account_id"],
				 success: updatePhoneBook,
				 list_id: list_id,
				 entry_id: entry_id
				});
}

function createPhoneBook(){
	if(is_too_fast(undefined, 60000)) return;
	console.log("Creating new phonebook");
	KAZOO.lists.addList({account_id: localStorage["account_id"],
			     success: updatePhoneBook,
			     error: (d,s)=>{ console.log("Can't create phonebook, response: %o", s.responseJSON); },
			     data:{ name: localStorage["username"] + "'s phone book" }});
}

function update_DND_ico(){
	chrome.runtime.sendMessage({
		sender: "KAZOO",
		type: "action",
		data: {action: "update_DND_icon"}
	}, ()=>{});
}

function switchDND(){
	if(is_too_fast()) return;
	KAZOO.user.get({userId: localStorage['user_id'], account_id: localStorage['account_id'],
			success: (data, status)=>{
				if(!(data.data.do_not_disturb && data.data.do_not_disturb.enabled)){
					data.data.do_not_disturb = {enabled: false};
				}
				data.data.do_not_disturb.enabled = !data.data.do_not_disturb.enabled;
				localStorage.dnd = data.data.do_not_disturb.enabled;
				KAZOO.user.update({data: data.data, userId: localStorage['user_id'], account_id: localStorage['account_id'],
						   success:(a,b)=>{
							   update_DND_ico(); },
						   error: (x)=>{ update_DND_ico(); }
						  });
			},
			error: (x)=>{ update_DND_ico(); }});
}

function updatePhoneBook(){
	if(is_too_fast()) return;
	KAZOO.lists.getLists({account_id: localStorage["account_id"], success: (data, status)=>{
		var phone_book = data.data.find((x)=>{return ( x.name == (localStorage["username"] + "'s phone book"));});
		if (phone_book) {
			localStorage["phoneBookListId"] = phone_book.id;
			KAZOO.lists.getEntries({account_id: localStorage["account_id"], list_id: phone_book.id,
						success:(d, s)=>{ localStorage["phone_book"] = JSON.stringify(d.data);},
						error:  (d, s)=>{ console.log(MODULE + " Can't create phonebook! response: %o", s.status); }});
		}else{
			createPhoneBook();
		}
	}, error: (data, status)=>{
		console.log("Update phoneBook error, code %o", status.status);
	}});
}

function updateDevices(){
	if(is_too_fast()) return;
	KAZOO.device.list({
		account_id: localStorage["account_id"],
		success: (data, status)=>{
			var new_devices = [];
			var devices = data.data;
			for(var device_num in devices) {
				if (devices[device_num].owner_id == localStorage.user_id) {
					new_devices.push({
						num: device_num,
						name: devices[device_num].name,
						id: devices[device_num].id
					});
				}
			};
			localStorage["devices"] = JSON.stringify(new_devices);

			localStorage["active_device"] = (localStorage["active_device"] && devices[localStorage["active_device"]])? localStorage["active_device"]: "auto";
		}});
};

function reloadTabs(){
	chrome.tabs.getAllInWindow((tabs)=>{
		tabs.map((tab)=>{
			if (!tab.url.startsWith("chrome")) {
				chrome.tabs.reload(tab.id);
			}
		});
	});
}

function contentLoaded() {
	prepareToStart();
	updateLocalization();
	if (!(localStorage["url"] && localStorage["username"] && localStorage["accname"] && localStorage["credentials"])){
		chrome.browserAction.setIcon({path: "images/logo_offline_128x128.png"});
		return;
	}

	var kazoosdk_options = {
		apiRoot: localStorage["url"] + "v2/",

		onRequestStart: function(request, requestOptions) {
			//console.log(MODULE + "Request started: %o", request);
		},
		onRequestEnd: function(request, requestOptions) {
			//console.log(MODULE + "Request started: %o", request);
		},
		onRequestError: function(error, requestOptions) {
			if(requestOptions.generateError !== false) {
				console.log(MODULE + " Request error: %o %o", error.status, error.status.text);
			}
			var error_count = incrementErrorCount(error.status);

			if (error.status == "401"){
				if (error_count < 3) {
					window.setTimeout(authorize, 1500);
				}
			}

			 showError(error);
		}
	};
	KAZOO = $.getKazooSdk(kazoosdk_options);

	authorize();
}

function prepareToStart(){
	if (!localStorage["errors"]) {
		localStorage["errors"] = JSON.stringify({});
	}
	if (!localStorage["vm_media"]) {
		localStorage["vm_media"] = JSON.stringify({});
	}
	if(!localStorage["vm_boxes"]){
		localStorage["vm_boxes"] = JSON.stringify([]);
	}
	if (!localStorage["history"]) {
		localStorage["history"] = JSON.stringify([]);
	}
	if (!localStorage["pkg_dump"]) {
		var preset = {
			"Call-Direction": "",
			"Event-Name": ""
		};
		localStorage["pkg_dump"] = JSON.stringify(preset);
	}
	if (!localStorage["custom_profile_page"]) {
		localStorage["custom_profile_page"] = "https://google.com/search?q={{Caller-ID-Name}}%20{{Caller-ID-Number}}";
	}
	if(!localStorage["active_device"] || localStorage["active_device"] == ""){
		localStorage["active_device"] = "auto";
	}
}

function incrementErrorCount(error_code){
	console.log(MODULE + " Error %o count increased", error_code);
	var errors = storage.get("errors", {});
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
	if(is_too_fast()) return;
	console.log(MODULE + " Start authorizing routines...");
	localStorage["connectionStatus"] = "inProgress";
	chrome.browserAction.setIcon({path: "images/logo_wait_128x128.gif"});
	KAZOO.auth.userAuth({
		data: {
			account_name: localStorage["accname"],
			method: "md5",
			credentials: localStorage["credentials"]
		},
		success: function(data, status) {
			console.log(MODULE + " Require user data...");			
			localStorage["account_id"] = data.data.account_id;
			//localStorage["user_id"] = data.data.owner_id;
			KAZOO.user.list({
				account_id: data.data.account_id,
				filters: { filter_username: localStorage["username"] },
				success: function(b_data, b_status) {
					localStorage["name"] = b_data.data[0].first_name + " " + b_data.data[0].last_name;
					localStorage["email"] = b_data.data[0].email;
					console.log(MODULE + " Auth completed, welcome ", localStorage["name"]);
					chrome.browserAction.setIcon({path: "images/logo_online_128x128.png"});
					localStorage["connectionStatus"] = "signedIn";
					localStorage["errorMessage"]="";
					localStorage["authTokens"] = KAZOO.authTokens[Object.keys(KAZOO.authTokens)[0]];
					localStorage["user_id"] = b_data.data[0].id;
					updateDevices();
					updateVoiceMails();
					updatePhoneBook();
					signToBlackholeEvents();

					clearInterval(AUTH_DAEMON_ID);
					clearInterval(VM_DAEMON_ID);
					AUTH_DAEMON_ID = window.setInterval(authorize, 60*60*1000); // update auth-token every hour
					VM_DAEMON_ID = window.setInterval(updateVoiceMails, 30*1000);
				},
				error: error_handler
			});
		},
		error: error_handler,
		generateError: true
	});
}

var last_blackhole_pkg = {};
function signToBlackholeEvents(){
	if(is_too_fast()) return;
	if (!(io && io.connect)) return;

	var blackholeUrl = localStorage.url.replace(/:[0-9]+\/$/, ":5555");
	SOCKET = io.connect(blackholeUrl);
	SOCKET.emit('subscribe', {
		account_id: localStorage.account_id,
		auth_token: localStorage.authTokens,
		binding: 'call.*.*'
        });

	SOCKET.emit('subscribe', {
		account_id: localStorage.account_id,
		auth_token: localStorage.authTokens,
		binding: 'fax.status.*'
        });

	function call_event_handler(EventJObj) {
		var devices = storage.get("devices", []).map((x)=>{return x.id;});
		if (is_too_fast(EventJObj["Event-Name"] + "_" + EventJObj["Call-Direction"]) ||
		    !EventJObj["Custom-Channel-Vars"]["Account-ID"] === localStorage["account_id"] ||	//FIXME(?)
		    devices.findIndex((x)=>{ return x == EventJObj["Custom-Channel-Vars"]["Authorizing-ID"];}) < 0) return;
		var number, in_phone_book_name, name;
		if (EventJObj["Event-Name"] === "CHANNEL_CREATE") {
			storage.assign("pkg_dump", flatten(EventJObj));		// Dump blackhole package structure
			var is_outgoing = // EventJObj["Caller-ID-Name"] === "Device QuickCall" ||
				    EventJObj["Call-Direction"] === "inbound";
			last_blackhole_pkg = EventJObj;

			number = is_outgoing? (EventJObj["Callee-ID-Number"] || EventJObj["To"].split('@')[0]):
				    (EventJObj["Caller-ID-Number"] || EventJObj["Other-Leg-Caller-ID-Number"] || EventJObj["From"].split('@')[0] || "unknown");
			in_phone_book_name = storage.get("phone_book", []).find((x)=>{return (x.value.phone == number);});
			if(in_phone_book_name && in_phone_book_name.value && in_phone_book_name.value.name) in_phone_book_name = in_phone_book_name.value.name;
			name = is_outgoing? (EventJObj["Callee-ID-Name"] || EventJObj["To"].split('@')[0]):
				(EventJObj["Caller-ID-Name"] || EventJObj["Other-Leg-Caller-ID-Name"] || EventJObj["From"].split('@')[0] ||"unknown");
			storage.push("history", {
				number: number,
				time: Date.now(),
				type: is_outgoing?"outgoing":"received",
				name: in_phone_book_name? (in_phone_book_name + " (" + name + ")") : name
			});
			if(is_outgoing && localStorage.outboundCallNotificationsEnabled !== "true") return;
			if(!is_outgoing && localStorage.inboundCallNotificationsEnabled !== "true") return;
			if(EventJObj["Caller-ID-Name"] === "Device QuickCall" && localStorage.onQuickCallNotifications !== "true") return;

			if(!is_outgoing && localStorage.system_notification === "true"){
				chrome.notifications.create("Kazoo chrome extension push event", {
					type: "basic",
					iconUrl: "images/phone-push.png",
					title: "Incoming Call",
					//eventTime: 2000,
					isClickable: true,
					buttons: [{title:"View profile info"}, {title: "Call forward"}],
					message: "User " + (in_phone_book_name? (in_phone_book_name + " (" + name + ")") : name) + " calling",
					contextMessage: number
				}, ()=>{});
				chrome.notifications.onClicked.addListener((id)=>{
					if(id !== "Kazoo chrome extension push event") return;
					blackholeUserActionHandler("VIEW_PROFILE");
				});
				chrome.notifications.onButtonClicked.addListener((id, b_idx)=>{
					if(id !== "Kazoo chrome extension push event") return;
					if (b_idx === 0) {
						alert("OK");
					}else{
						alert("Not OK");
					}
				});
			}
		}

		if (EventJObj["Event-Name"] === "CHANNEL_DESTROY")
			chrome.notifications.clear("Kazoo chrome extension push event");

		if (!is_too_fast("send_" + EventJObj["Event-Name"])){
			chrome.tabs.query({active: true}, function(tabs) {
				chrome.tabs.sendMessage(tabs[0].id, {
					sender: "KAZOO",
					type: "event",
					data: {
						number: number,
						in_phone_book_name: in_phone_book_name,
						name: name,
						"Event-Name": EventJObj["Event-Name"],
						"Call-Direction": EventJObj["Call-Direction"]

					}
				}, ()=>{});
			});
		}
	}


	function fax_event_handler(EventJObj){
		if(is_too_fast()) return;

		if(localStorage.fax_system_notification === "true"){
			chrome.notifications.create("Kazoo chrome extension fax event", {
				type: "basic",
				iconUrl: "images/phone-push.png",
				title: "Received fax",
				//eventTime: 2000,
				isClickable: true,
				buttons: [{title:"View"}, {title: "Cancel"}],
				message: "Received fax from " + EventJObj.data.name,
				contextMessage: EventJObj.data.number
			}, ()=>{});
			chrome.notifications.onClicked.addListener((id)=>{
				if(id !== "Kazoo chrome extension fax event") return;
				blackholeUserActionHandler("VIEW_FAX");
			});
			chrome.notifications.onButtonClicked.addListener((id, b_idx)=>{
				if(id !== "Kazoo chrome extension fax event") return;
				if (b_idx === 0) {
					alert("OK");
				}else{
					alert("Not OK");
				}
			});
		}
		
		// chrome.tabs.query({active: true}, function(tabs) {
		// 		chrome.tabs.sendMessage(tabs[0].id, {
		// 			sender: "KAZOO",
		// 			type: "event",
		// 			data: {
		// 				number: EventJObj.data.number,
		// 				name: EventJObj.data.name,
		// 				"Event-Name": EventJObj["Event-Name"]
		// 			}
		// 		}, ()=>{});
		// 	});		
	}

	function conference_event_handler(EventJObj){
		if(is_too_fast()) return;

		if(localStorage.conerence_system_notification === "true"){
			chrome.notifications.create("Kazoo chrome extension conference event", {
				type: "basic",
				iconUrl: "images/phone-push.png",
				title: "Received fax",
				//eventTime: 2000,
				isClickable: true,
				buttons: [{title:"View"}, {title: "Cancel"}],
				message: "Received fax from " + EventJObj.data.name,
				contextMessage: EventJObj.data.number
			}, ()=>{});
			chrome.notifications.onClicked.addListener((id)=>{
				if(id !== "Kazoo chrome extension fax event") return;
				blackholeUserActionHandler("VIEW_FAX");
			});
			chrome.notifications.onButtonClicked.addListener((id, b_idx)=>{
				if(id !== "Kazoo chrome extension fax event") return;
				if (b_idx === 0) {
					alert("OK");
				}else{
					alert("Not OK");
				}
			});
		}
	}
	

	SOCKET.on('CHANNEL_CREATE', call_event_handler);
	SOCKET.on('CHANNEL_ANSWER', call_event_handler);
	SOCKET.on('CHANNEL_DESTROY', call_event_handler);
        SOCKET.on('FAX_RECEIVED', fax_event_handler);                             //FIXME: Event name
	SOCKET.on('CONFERENCE_PARTICIPANT', conference_event_handler);            //FIXME: Event name
}


function error_handler(data, status){
	console.log(MODULE + " Error: ", status.error);
	chrome.browserAction.setIcon({path: "images/logo_offline_128x128.png"});
	localStorage["connectionStatus"]= "authFailed";
	localStorage.removeItem('credentials');
	localStorage["errorMessage"] = status.responseText;

	bg_restart();
}

function updateVoiceMails(){
	if(is_too_fast()) return;
	KAZOO.voicemail.list({
		filters: { filter_owner_id: localStorage["user_id"] },
		account_id: localStorage["account_id"],
		success: (data, status)=> {
			data.data.map((box)=>{
				KAZOO.voicemail.get({
					account_id: localStorage["account_id"],
					voicemailId: box.id,
					success: (box_data, box_status)=> {
						var msg_list = storage.get("vm_media", {});
						msg_list[box.id] = box_data.data;
						storage.set("vm_media", msg_list);
					}
				});
			});

			var box_list = storage.get("vm_boxes", []);
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
			storage.set("vm_boxes", new_boxes);
		}});
}

function blackholeUserActionHandler(action){
	switch(action){
	case "TAKE":
		alert("Received");
		break;

	case "OVERLAY":
		alert("Overlay");
		break;

	case "REJECT":
		alert("Rejected");
		break;

	case "VIEW_PROFILE":
		var newURL = substitute(localStorage["custom_profile_page"], flatten(last_blackhole_pkg));
		chrome.tabs.create({ url: newURL });
		break;

	default:
		showError({statusText: "Cannot execute command", status: ""});
		console.log(MODULE + " Unknown action from content-script: %o", action);
	}
}

function substitute(str, data){
	for(var replaceable in data){
		str = str.replace(new RegExp("{{" + replaceable + "}}", 'g'), data[replaceable]);
	}

	return str;
}

function gentlyOpenPage(url){
	var local_url = chrome.extension.getURL(url);
	chrome.tabs.query({url: local_url}, (x)=>{
		var activate_tab = x.pop();
		if (activate_tab) {
			chrome.tabs.highlight({tabs: activate_tab.index});
			chrome.tabs.remove(x.map((t)=>{ return t.id;}), ()=>{});
		}else{
			chrome.tabs.create({url: local_url});
		}
	});
}

function bg_restart(){
	KAZOO = {};
	SOCKET = {};
	clearInterval(AUTH_DAEMON_ID);
	clearInterval(VM_DAEMON_ID);
	contentLoaded();
}

chrome.extension.onMessage.addListener(onMessage);
document.addEventListener('DOMContentLoaded', ()=>{contentLoaded();});
chrome.contextMenus.create({
	onclick: (a,b)=>{
		if(a.mediaType == "image"){

		}else{
			var text = a.selectionText;
			var international = "(([+]?)([0-9][0-9]?)((\\.|-| )([0-9]{1,3}))((\\.|-| )([0-9]{1,4})){2,4})";
			var us = "((([2-9][0-8][0-9])|([\(][2-9][0-8][0-9][\)]))(\\.|-| )?([2-9][0-9]{2})(\\.|-| )?([0-9]{4}))";
			var re = new RegExp();
			re.compile("(" + us + "|" + international + ")");

			var localization = storage.get("localization", {});
			var phone = text.match(re);
			if (phone) {
				var name = prompt(localization.get_owner_name.message + " " +phone[0], localization.anonymous.message);
				if (name) {
					phoneBookAddEntry(name, phone[0]);
				}
			} else {
				alert(localization.cant_parse_number.message + " :(");
			}
		}
	},
	id: "add_phone",
	title:"Add to phonebook",
	contexts: ["selection", "image"]
});
chrome.runtime.onInstalled.addListener((details)=>{
	reloadTabs();
});
