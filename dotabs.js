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

var MODULE = "dotabs.js";

// retrieve stored name
$("#name").text(localStorage["name"]);

function formatTimestamp(timestamp) {
	var today = new Date();
	var dt = new Date(timestamp);
	if (today.getDay() == dt.getDay() && today.getMonth() == dt.getMonth()
			&& today.getFullYear() == dt.getFullYear()) {
		var hours = dt.getHours();
		var minutes = dt.getMinutes();
		var ampm = hours >= 12 ? 'pm' : 'am';
		hours = hours % 12;
		hours = hours ? hours : 12;
		return hours + ":" + (minutes < 10 ? "0" + minutes : minutes) + " "
				+ ampm;
	}
	return dt.getMonth() + "/" + dt.getDay() + "/" + dt.getFullYear();
}

// signout
document.querySelector('#signout').addEventListener('click', function() {
	signout(true);
});

// about
document.querySelector('#about').addEventListener('click',
		showAboutBox);


// Signout. A manual signout means the user signed out themselves. In this case,
// clear out all info. If a force logout
// due to an authentication error or some other error, then retain some
// information.
function signout(manual) {

	localStorage.removeItem("vm_daemon_id");
	localStorage.removeItem("auth_daemon_id");
	localStorage.removeItem("authTokens");
	localStorage.removeItem("name");
	localStorage.removeItem("currentTab");
	localStorage.removeItem("connectionStatus");
	localStorage.removeItem("credentials");
	localStorage.removeItem("account_id");
	localStorage.removeItem("user_id");
	if (manual) {
		localStorage.removeItem("phone_book");
		localStorage.removeItem("history");
		localStorage.removeItem("devices");
		localStorage.removeItem("username");
		localStorage.removeItem("accname");
		localStorage.removeItem("clicktodial");
		localStorage.removeItem("notifications");
		localStorage.removeItem("texttospeech");
		localStorage.removeItem("errorMessage");
		localStorage.removeItem('vm_boxes');
		localStorage.removeItem("vm_media");
	}
	top.location.assign("options.html");
	chrome.runtime.sendMessage({type : "BG_RESTART"}, ()=>{});
}

function announceServiceState(service, value) {
	if (textToSpeechEnabled() == "true") {
		if (value == "true") {
			chrome.tts.speak(services[service].textToSpeech + "on");
		} else if (value == "false") {
			chrome.tts.speak(services[service].textToSpeech + "off");
		} else {
			chrome.tts.speak(services[service].textToSpeech + "unknown");
		}
	}
}


function history_handler(e){
	var tel = $(this).find("td:first-child() span").text();

	chrome.runtime.sendMessage({
		type : "CALL",
		text : tel
	}, ()=>{});

	return null;
}


function restoreTabs() {
	// create tabs
	$("#flags").hide();
	$("#tabs").tabs();

	// add activate(select) event handler for tabs
	$("#tabs").tabs(
		{
			activate : function(event, ui) {
				var new_panel_id = ui.newPanel.attr("id");

				switch(new_panel_id){
				case "history":
					localStorage["currentTab"] = "history";
					var list = storage.get("history", []);

					list.sort(function(a, b) {
						a = new Date(a.time);
						b = new Date(b.time);
						return b.getTime() - a.getTime();
					});
					$("#calllogentries").empty();
					for ( var i = 0; i < list.length; i++) {
						var row = "<tr id='calllogentry" + i + "_"
							    + list[i].number + "'>";
						row = row + "<td><p>" + list[i].name
						+ "</p><span>" + list[i].number + "</span></td>";
						row = row + "<td>"
							+ formatTimestamp(list[i].time)
							+ "</td>";
						if (list[i].type == "outgoing") {
							row = row
								+ "<td><img src='images/history_outgoing_normal.png '/></td>";
						} else if (list[i].type == "received") {
							row = row
								+ "<td><img src='images/history_incoming_normal.png'/></td>";
						} else {
							row = row
								+ "<td><img src='images/history_missed_normal.png'/></td>";
						}
						$("#calllogentries").append(row);
					}
					$("#calllogentries").on("click", "tr", history_handler);
					break;

				case "messages":
					localStorage["currentTab"] = "messages";
					var msg_list = storage.get("vm_boxes", []);
					$("#msgtable").empty();
					switch(msg_list.length){
					case 0:
						var p1, img, h2;

						p1= document.createElement("p");
						h2= document.createElement("h3");
						h2.innerText = "You have no voicemailboxes yet";
						p1.appendChild(h2);
						img = document.createElement("img");

						img.src = "images/no_voicemailbox.jpg";
						img.width = 250;

						$("#msgtable").append(p1);
						$("#msgtable").append(img);
						break;

					case 1:
						showVMMessages({currentTarget: {id: msg_list[0].id}});
						break;

					default:
						for ( var i = 0; i < msg_list.length; i++) {
							var new_row = create_box_row(msg_list[i].name, msg_list[i].mailbox, msg_list[i].messages, !msg_list[i].old, msg_list[i].id);
							$(new_row).on("click", showVMMessages);
							$("#msgtable").append(new_row);
							msg_list[i].old = true;
						}
						break;
					}

					localStorage["vm_boxes"] = JSON.stringify(msg_list);
					break;

				case "phonebook":
					localStorage["currentTab"] = "phonebook";

					if (localStorage["phone_book"] == "NONE") {
						$("#phonebookentries")[0].style.display = "none";
						$("#new_phonebook_msg")[0].style.display = "";

					}else {
						$("#phonebookentries")[0].style.display = "";
						$("#new_phonebook_msg")[0].style.display = "none";
						var pb_list = storage.get("phone_book", []);
						$("#phonebookentries").empty();
						// Create the first one table entry with input fields for creating new entries in phone book
						// || <input name> | <input number> | <add button> ||
						create_input_pb_row();
						//Fill phonebook table
						// || name | phone | remove_btn ||
						for ( var z = 0; z < pb_list.length; z++) {
							create_default_pb_row(pb_list[z].value.name, pb_list[z].value.phone, pb_list[z].id, z);
						}
					}
					break;

				case "preferences":
					localStorage["currentTab"] = "preferences";
					break;
				}
			}
		});

	// restore current tab
	switch(localStorage["currentTab"]){
	case "messages":
		$("#tabs").tabs("option", "active", 1);
		$("#tabs").tabs("option", "active", 0);
		if (localStorage.connectionStatus == "signedIn") {
			chrome.browserAction.setIcon({path: "images/logo_online_128x128.png"});
		}
		break;
	case "phonebook":
		$("#tabs").tabs("option", "active", 1);
		break;
	case "history":
		$("#tabs").tabs("option", "active", 2);
		break;
	case "preferences":
		$("#tabs").tabs("option", "active", 4);
		break;
	default:
		$("#tabs").tabs("option", "active", 0);
		$('#destination').focus();
		break;
	}

	var popup_heigth = localStorage["popup_heigth"] || 480;
	set_popup_heigth(popup_heigth);
	var resizer = document.getElementById("toolbar");
	resizer.onmousedown = (e)=>{
		$("body").css("-webkit-user-select", "none");
		window.getSelection().removeAllRanges();
		resizer.onmousemove = (e)=>{
			if (e.pageY < 250 || e.pageY > 570) return;
			var new_len = (e.pageY - 50) ;
			set_popup_heigth(new_len);
			localStorage["popup_heigth"] = new_len;
			e.preventDefault();
		};
		resizer.onmouseup = (e)=>{
			resizer.onmousemove = null;
		};
		resizer.onmouseout = (e)=>{
			resizer.onmousemove = null;
			$("body").css("-webkit-user-select", "auto");
		};
		e.preventDefault();
	};

	$(".btn_added").on("click", btn_handler);
	$("#btn12").on("click", call_btn);
	$("#destination").on('keydown', function(e) {
		if (e.which == 13) call_btn();
	});

	$("#create_phonebook_btn").on('click', create_phonebook_handler);

	$("#language").val(localStorage.lang);
	$("#language").on("change", switch_lang_handler);

	$("#dndbutton").on("click", dnd_btn_handler);
	updateDNDButtonImage();

	var contextMenu = {};
	contextMenu["Language"] = createLanguagesContextMenuItem([{shortName: "ru", fullName:"Russian"}, {shortName: "en", fullName:"English"}]);
	contextMenu["Active device"] = createDevicesContextMenuItem();
	contextMenu["Click to dial"] = createClickToDialContextMenuItem();
	contextMenu["On call behavior"] = createOnCallBehaviorContextMenuItem();
	contextMenu["sep1"] = "---------";
	contextMenu["Clear history"] = {
		name: "Clear history",
		callback: (x)=>{
			localStorage.history = JSON.stringify([]);
			$("#calllogentries").empty();
		}
	};
	drawContextMenu(contextMenu);
	updatePhoneBook();
	localize();
}


function showVMMessages(e){
	var vmbox_id = e.currentTarget.id;
	var media_list = storage.get("vm_media", []);
	
	$("#msgtable").empty();
	if (media_list[vmbox_id] &&
	    media_list[vmbox_id].messages &&
	    media_list[vmbox_id].messages.length == 0) {
		var p1, img, h2;

		p1= document.createElement("p");
		h2= document.createElement("h3");
		h2.innerText = "You have no voicemails yet";
		p1.appendChild(h2);
		img = document.createElement("img");

		img.src = "images/no_voicemailbox.jpg";
		img.width = 250;

		$("#msgtable").append(p1);
		$("#msgtable").append(img);
	} else {
		for ( var i = 0; i < media_list[vmbox_id].messages.length; i++) {
			var new_info_row = create_info_media_row(media_list[vmbox_id].messages[i].from,
								 media_list[vmbox_id].messages[i].caller_id_number,
								 media_list[vmbox_id].messages[i].caller_id_name,
								 vmbox_id,
								 media_list[vmbox_id].messages[i].media_id );
			var new_player_row = create_play_media_row(vmbox_id, media_list[vmbox_id].messages[i].media_id);

			$(new_info_row).append(new_player_row);
			$("#msgtable").append(new_info_row);
		}
	}
	$("#msgtable").on("click", ".mes__row", function() {
		audio = $(this).find("audio");
		$(audio)[0].pause();
		$(audio)[0].currentTime = 0;
		$(audio).closest(".mes__audio").toggle(300);
	});
	$("#msgtable").append("<div class='back'>Back</div>");
	$(".back").one("click", function() {
		$("#msgtable").off("click", ".mes__row");
		$("#tabs").tabs("option", "active", 1);
		$("#tabs").tabs("option", "active", 0);
	});
}

function create_play_media_row(vmbox_id, media_id){
	var src = localStorage["url"] + "v2/accounts/" +
			localStorage["account_id"]+ "/vmboxes/" +
			vmbox_id + "/messages/" + media_id +
			"/raw?auth_token="+ localStorage["authTokens"];

	return $("<div class='mes__audio'><audio controls='true'><source type='audio/ogg' src='" + src + "' /></audio></div>");
}

function set_popup_heigth(new_len){
	$("#tabs")[0].style.height = (new_len - 150) + "px";
	$("#messages")[0].style.height = (new_len - 190) + "px";
	$("#phonebook")[0].style.height = (new_len- 190) + "px";
	$("#history")[0].style.height = (new_len- 190) + "px";
}

function create_input_pb_row(){
	var input_field, col1, col2, col3, input1, input2, image;
	var translate = storage.get("localization", {
		"pb_name_placeholder": {"message": "name"},
		"pb_phone_placeholder": {"message": "phone number"}
	});
	
	input_field = document.createElement("tr");
	col1 = document.createElement("td");
	col2 = document.createElement("td");
	col3 = document.createElement("td");
	input1 = document.createElement("input");
	input2 = document.createElement("input");
	image = document.createElement("img");

	input1.id = "pb_new_name";
	input1.placeholder = translate["pb_name_placeholder"].message;
	input1.size=15;
	input2.id = "pb_new_phone";
	input2.placeholder = translate["pb_phone_placeholder"].message;
	input2.size=15;
	image.src = "images/add.png";
	image.onclick = (e)=>{
		var row = create_default_pb_row($("#pb_new_name").val(),  $("#pb_new_phone").val(), Math.random());
		$("#phonebookentries").append(row);
		chrome.runtime.sendMessage({
			type: "PHONE_BOOK_ADD_ENTRY",
			name: $("#pb_new_name").val(),
			phone: $("#pb_new_phone").val() + "" }, (e)=>{
				var event = new KeyboardEvent('input');
				$("#pb_new_name").val("");
				$("#pb_new_phone").val("");
				document.querySelector('#pb_new_name').dispatchEvent(event);
				document.querySelector('#pb_new_phone').dispatchEvent(event);
			});
	};

	col1.appendChild(input1);
	col2.appendChild(input2);
	col3.appendChild(image);

	input_field.appendChild(col1);
	input_field.appendChild(col2);
	input_field.appendChild(col3);

	$("#phonebookentries").append(input_field);

	$("#pb_new_name").on('input', text_input_handler_names);
	$("#pb_new_phone").on('input', text_input_handler_phones);
}

function text_input_handler_names(e){
	var table = $("#phonebookentries");
	var template = e.currentTarget.value + "";
	table.children().children().map((index, object)=>{
		if(index == 0) return;
		var text = object.childNodes[0].childNodes[0].textContent;
		if (text.search(template) == -1) {
			table.children().children()[index].style.visibility = "hidden";
		} else {
			table.children().children()[index].style.visibility = "visible";
		}
	});
}

function create_info_media_row(from, number, name, box_id, media_id){
	var row, col1, col2, col3, p1, img;
	row = $("<div class='mes__row'></div>");
	col1 = $("<div class='mes__col mes__col-1'></div>");
	col2 = $("<div class='mes__col mes__col-2'></div>");
	col3 = $("<div class='mes__col mes__col-3'></div>");
	p1= $("<p class='mes__p'></p>");
	img = $("<img class='mes__img' />");

	$(p1).text(from).attr("title", from);
	$(img).attr("src", "images/remove.png");
	$(col1).text(number).attr("title", number);
	$(col1).append(p1);
	$(col2).text(name).attr("title", name);
	$(col3).append(img);

	$(row).append(col1).append(col2).append(col3);

	return row;
}

function create_box_row(name, phone, count, is_new, id){
	var row, col1, col2, col3, p1, img;
	row = $("<div class='mes__row'></div>");
	col1 = $("<div class='mes__col mes__col-1'></div>");
	col2 = $("<div class='mes__col mes__col-2'></div>");
	col3 = $("<div class='mes__col mes__col-3'></div>");
	p1= $("<p class='mes__p'></p>");
	img = $("<img class='mes__img' />");

	$(p1).text(name).attr("title", name);
	$(img).attr("src", "images/msg_" + (is_new ? "new" : "old") + ".png");
	$(col1).text(phone).attr("title", phone);
	$(col1).append(p1);
	$(col2).text(count);
	$(col3).append(img);

	$(row).append(col1).append(col2).append(col3);
	$(row).attr("id", id);

	return row;
}

function text_input_handler_phones(e){
	var table = $("#phonebookentries");
	var template = e.currentTarget.value + "";
	template = template.replace("+", "\\+");
	table.children().children().map((index, object)=>{
		if(index == 0) return;
		var text = object.childNodes[1].childNodes[0].textContent;
		if (text.search(template) == -1) {
			table.children().children()[index].style.visibility = "hidden";
		} else {
			table.children().children()[index].style.visibility = "visible";
		}
	});
}

function create_default_pb_row(name, phone, id, index){
	index = index? index: 100 + Math.random();

	var row, col1, col2, col3, p1, p2, img;
	row = document.createElement("tr");
	col1 = document.createElement("td");
	col2 = document.createElement("td");
	col3 = document.createElement("td");
	p1= document.createElement("p");
	p2= document.createElement("p");
	img = document.createElement("img");

	p1.innerText = name;
	p2.innerText = phone;
	img.src = "images/remove.png";
	img.id = id;
	img.onclick = (e)=>{
		$("#"+ e.currentTarget.id)[0].parentNode.parentNode.remove();
		chrome.runtime.sendMessage({
			type : "PHONE_BOOK_REMOVE_ENTRY",
			entry_id: e.currentTarget.id }, ()=>{});
	};
	col1.appendChild(p1);
	col2.appendChild(p2);
	col3.appendChild(img);
	col1.onclick = (e)=>{
		chrome.runtime.sendMessage({
			type : "CALL",
			text : e.currentTarget.parentNode.childNodes[1].childNodes[0].innerText }, ()=>{});
	};
	col2.onclick = (e)=>{
		chrome.runtime.sendMessage({
			type : "CALL",
			text : e.currentTarget.childNodes[0].innerText }, ()=>{});
	};

	row.id = "calllogentry'" + index + "_" + name;
	row.appendChild(col1);
	row.appendChild(col2);
	row.appendChild(col3);

	$("#phonebookentries").append(row);
}

function create_phonebook_handler(){
	var message = { type : "CREATE_PHONE_BOOK"};
	chrome.runtime.sendMessage(message, ()=>{});
	$("#phonebookentries")[0].style.display = "";
	$("#new_phonebook_msg")[0].style.display = "none";
}

function updatePhoneBook(){
	var message = { type : "UPDATE_PHONE_BOOK"};
	chrome.runtime.sendMessage(message, ()=>{});
}

function updateDNDButtonImage(){
	$("#dndbutton")[0].src = "images/dnd_" + (localStorage.dnd=="true"? "active.png":"normal.png");
}

function dnd_btn_handler(){
	$("#dndbutton")[0].src = "images/logo_wait_128x128.gif";
	chrome.runtime.sendMessage({type : "SWITCH_DND"}, updateDNDButtonImage);
}

function localize(){
	try{
		var x = storage.get("localization", {});

		$("#help_why").text(x.help_why.message);
		$("#help_why")[0].title = x.help_why_answer.message;
		$("#help_ask_create_pb").text(x.help_ask_create_pb.message);
		$("#help_ask_create_pb2").text(x.help_ask_create_pb2.message);
		$("#signout_text")[0].innerText = x.signout_text.message;
		$("#history_tab")[0].title = x.history_tab.message;
		$("#pref_tab")[0].title = x.pref_tab.message;
		$("#destination")[0].placeholder = x.phone_num.message;
		$("#dndbutton")[0].title = x.dndbutton.message;
		// $("#about")[0].innerText = x.about.message;
	}catch(e){
		LOGGER.API.log(MODULE, "Localization error: " +  e);
	};
}

function switch_lang_handler(lang){ // FIXME
	localStorage.lang = lang;
	var message = { type : "UPDATE_LOCALIZATION"};
	chrome.runtime.sendMessage(message, ()=>{});
	window.setTimeout(localize, 500);
}

function btn_handler(e){
	$("#destination")[0].value += e.currentTarget.textContent;
}

function call_btn(){
	var message = {
		type : "CALL",
		text : $("#destination")[0].value
	};
	$("#destination").val("");
	chrome.runtime.sendMessage(message, ()=>{});
}


function hhmmssToString(hh, mm, ss) {
	var ret = ss;
	if (ss < 10) {
		ret = "0" + ss;
	}
	if (mm < 10) {
		ret = "0" + mm + ":" + ret;
	} else {
		ret = mm + ":" + ret;
	}
	if (hh > 0) {
		ret = hh + ":" + ret;
	}
	return ret;
}

function textToSpeechEnabled() {
	var texttospeech = localStorage["texttospeech"];
	return texttospeech;
}

function showAboutBox() {
	top.location.assign("about.html");
}

//background error drawer
chrome.runtime.onMessage.addListener((a,b,c)=>{
	if (!a.sender == "KAZOO") return;

	if (a.type == "error") {
		var error_code = a.data.status || a.data.error;
		switch(error_code + ""){
		case "0":
			showMessage("Bad server url.");
			break;

		case "429":
			showMessage("Too many requests.");
			break;

		case "400":
		case "401":
			showMessage("Authorization error.");
			break;

		default:
			showMessage(a.data.statusText + " (" + a.data.status  + ")");
			console.log(a);
			break;
		}
	}
});

function showMessage(message){
	$("#error_msg").text(message).attr("title", message);
	$("#error_msg").fadeIn();
	$("#error_msg").fadeOut(5000);
}

/*Example input: [{shortName: "ru", fullName:"Russian"}, {shortName: "en", fullName:"English"}]*/
function createLanguagesContextMenuItem(list){
	var langs = {name: "Language", items: {}};
	for(var i = 0; i < list.length; i++) {
		langs.items[list[i].shortName] = {
			name: list[i].fullName,
			type: 'radio',
			radio: 'radio_lang',
			value: list[i].shortName,
			//icon: "edit",
			//selected: localStorage["lang"] == list[i].shortName,
			events: {
				click: (e)=>{ switch_lang_handler(e.currentTarget.value); }
			}
		};
	}

	return langs;
}


function createDevicesContextMenuItem(){	
	var devices = storage.get("devices", {});
	var device_items = {name: "Active device", items: {}};	
	for(var i in devices) {
		device_items.items[devices[i].num] = {
			name: devices[i].name,
			type: 'radio',
			radio: 'radio_dev',
			value: devices[i].id,
			//selected: localStorage["active_device"] == devices[i].id,
			events: {
				click: (e)=>{ localStorage["active_device"] = e.currentTarget.value;}}
		};
	}
	device_items.items["any_phone"] = {
		name: "Auto",
		type: 'radio',
		radio: 'radio_dev',
		value: "any_phone",
		//selected: (localStorage["active_device"] == "any_phone") || (localStorage["active_device"] == "") || !localStorage["active_device"],
		events: {
			click: (e)=>{ localStorage["active_device"] = e.currentTarget.value;}}
	};

	return device_items;
};

function drawContextMenu(items){
	$.contextMenu({
		selector: '#options',
		trigger: 'left',
		items: items,
		events: {
			show: function(opt) {
				var data = {
					"Click to dial": (localStorage["clicktodial"] == "true"),
					"inbound_notify": (localStorage.inboundCallNotificationsEnabled == "true"),
					"outbound_notify": (localStorage.outboundCallNotificationsEnabled == "true"),
					"radio_dev": (localStorage["active_device"] == "" || localStorage["active_device"] == "any_phone" || !localStorage["active_device"])?
						"any_phone" : localStorage["active_device"],
					"radio_lang": localStorage["lang"],
					"system_notify": localStorage.system_notification == "true",
					"quickcall_notify": localStorage.onQuickCallNotifications == "true"
				};
				$.contextMenu.setInputValues(opt, data);
			}
		}
	});
}

function createClickToDialContextMenuItem(){
	var ctd_item = {
		name: "Enable Click to Dial",
		type: 'checkbox',
                //selected: localStorage["clicktodial"]=="true",
		events: { click: (e)=>{
				localStorage["clicktodial"] = !(localStorage["clicktodial"] == "true"); }
		}
	};

	return ctd_item;
}

function createOnCallBehaviorContextMenuItem(){
	var options = {name: "On call behavior", items: {}};

	options.items["inbound_notify"] = {
		name: "On inbound call notification",
		type: 'checkbox',
                //selected: localStorage.inboundCallNotificationsEnabled=="true",
		events: { click: (e)=>{
			localStorage.inboundCallNotificationsEnabled = !(localStorage.inboundCallNotificationsEnabled == "true"); }
			}
	};

	options.items["outbound_notify"] = {
		name: "On outbound call notification",
		type: 'checkbox',
                //selected: localStorage.outboundCallNotificationsEnabled=="true",
		events: { click: (e)=>{
			localStorage.outboundCallNotificationsEnabled = !(localStorage.outboundCallNotificationsEnabled == "true"); }
			}
	};
	options.items["system_notify"] = {
		name: "System notification",
		type: 'checkbox',
                //selected: localStorage.system_notification === "true",
		events: { click: (e)=>{
			localStorage.system_notification = !(localStorage.system_notification == "true"); }
			}
	};
	options.items["quickcall_notify"] = {
		name: "QuickCall notification",
		type: 'checkbox',
                //selected: localStorage.system_notification === "true",
		events: { click: (e)=>{
			localStorage.onQuickCallNotifications = !(localStorage.onQuickCallNotifications == "true"); }
			}
	};

	
	options.items["sep2"] = "---------";
	options.items["customize_profile_viewer"] = {
		name: "Customize profile viewer",
		callback: (e)=>{
			var message = "Введите адрес вашего сайта, которому будут переданы все необходимые параметры звонка. \n" +
			    "Поддерживаемые  параметры: \n";
			var pkg_dump = storage.get("pkg_dump", {});
			for(var name in pkg_dump){
				message +=  name + ", ";
			}
			if(message.length >= 2)
				message = message.slice(0, -2);
			localStorage["custom_profile_page"] = prompt(message, localStorage["custom_profile_page"]) || localStorage["custom_profile_page"];
		}
	};

	return options;
}

var storage = {
	get: function(key, def_val){
		if(typeof(def_val) === "string")
			return localStorage[key] || def_val;

		var value = def_val;
		try{
			value = JSON.parse(localStorage[key]);
		}catch(e){}
		return value;
	},
	set: function(key, val){		
		localStorage[key] = typeof(val) === "string"? val: JSON.stringify(val);
	},
	push: function(key, new_val){
		var old_val = this.get(key, []);
		old_val.push(new_val);
		this.set(key, old_val);
	},
	assign: function(key, val){
		if(typeof(val) !== "object") throw new Error("Assign for Objects only!");
		var old_val = this.get(key, {});
		this.set(key, Object.assign(old_val, val));
	}
};

document.addEventListener('DOMContentLoaded', restoreTabs);
