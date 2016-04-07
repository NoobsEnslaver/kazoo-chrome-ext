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
	localStorage["name"] = "";
	localStorage["currentTab"] = "";
	localStorage["connectionStatus"] = "signedOut";
	localStorage["credentials"] = "";
	localStorage["account_id"] = "";
	localStorage["user_id"] = "";
	if (manual) {
		localStorage["phone_book"]= "NONE";
		localStorage["history"] = JSON.stringify([]);
		localStorage["devices"] = JSON.stringify([]);
		localStorage["username"] = "";
		localStorage["accname"] = "";
		localStorage["clicktodial"] = "";
		localStorage["notifications"] = "";
		localStorage["texttospeech"] = "";
		localStorage["errorMessage"] = "";
		localStorage.removeItem('vm_boxes');
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

//Go up to parrents tree, looking for number.
function phonebook_handler(e){
	if (e) {
		if (e.tagName) {
			return 	e.tagName != "TR"? phonebook_handler(e.parentNode):
				e.id == "phonebook_new_entry"? null:
				chrome.runtime.sendMessage({
					type : "CALL",
					text : e.childNodes[1].textContent}, ()=>{});
		} else
		{
			return e.target? phonebook_handler(e.target): null;
		}
	}
	return null;
}


function history_handler(e){
	if (e) {
		if (e.tagName) {
			return e.tagName != "TR"? history_handler(e.parentNode):
				chrome.runtime.sendMessage({
					type : "CALL",
					text : e.childNodes[0].textContent}, ()=>{});
		} else
		{
			return e.target? history_handler(e.target): null;
		}
	}
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
				if (ui.newPanel.attr("id") == "history") {
					localStorage["currentTab"] = "history";
					var list;
					try{
						list = JSON.parse(localStorage["history"]);
					}catch(e){
						list = [];
					}
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
							+ "</p>" + list[i].number + "</td>";
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
					$("#calllogentries").on("click", history_handler);
				} else if (ui.newPanel.attr("id") == "dialer") {
					localStorage["currentTab"] = "dialer";
					$('#destination').focus();
				} else if (ui.newPanel.attr("id") == "preferences") {
					localStorage["currentTab"] = "preferences";
				} else if (ui.newPanel.attr("id") == "messages") {
					localStorage["currentTab"] = "messages";
					var msg_list;
					try{
						msg_list = JSON.parse(localStorage["vm_boxes"]);
					}catch(e){
						msg_list = [];
					}
					
					$("#msgtable").empty();
					for ( var i = 0; i < msg_list.length; i++) {
						var new_row = create_box_row(msg_list[i].name, msg_list[i].mailbox, msg_list[i].messages, !msg_list[i].old, msg_list[i].id);
						new_row.onclick = showVMMessages;
						$("#msgtable").append(new_row);
						msg_list[i].old = true;
					}
					localStorage["vm_boxes"] = JSON.stringify(msg_list);
				} else if (ui.newPanel.attr("id") == "phonebook") {
					localStorage["currentTab"] = "phonebook";

					if (localStorage["phone_book"] == "NONE") {
						$("#phonebookentries")[0].style.display = "none";
						$("#new_phonebook_msg")[0].style.display = "";
						
					}else {
						$("#phonebookentries")[0].style.display = "";
						$("#new_phonebook_msg")[0].style.display = "none";
						
						var pb_list;
						try{
							pb_list = JSON.parse(localStorage["phone_book"]);	
						}catch(e){
							pb_list = [];
						}

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
				}
			}
		});

	// restore current tab
	switch(localStorage["currentTab"]){
	case "dialer":
		$("#tabs").tabs("option", "active", 0);
		$('#destination').focus();
		break;				
	case "messages":
		$("#tabs").tabs("option", "active", 1);
		break;		
	case "phonebook":
		$("#tabs").tabs("option", "active", 2);
		break;
	case "history":
		$("#tabs").tabs("option", "active", 3);
		break;
	case "preferences":
		$("#tabs").tabs("option", "active", 4);
		break;
	default:
		$("#tabs").tabs("option", "active", 0);
		$('#destination').focus();
		break;
	}

	set_popup_heigth(localStorage["popup_heigth"]);
	var resizer = document.getElementById("toolbar");
	resizer.ondragstart = (e)=>{return false;};
	resizer.onmousedown = (e)=>{
		resizer.onmousemove = (e)=>{			
			if (e.pageY < 250 || e.pageY > 550) return;
			var new_len = (e.pageY - 50) ;
			set_popup_heigth(new_len);
			localStorage["popup_heigth"] = new_len;
		};
		resizer.onmouseup = (e)=>{
			resizer.onmousemove = null;
		};
	};

	$("#btn1").on("click", btn_handler);
	$("#btn2").on("click", btn_handler);
	$("#btn3").on("click", btn_handler);
	$("#btn4").on("click", btn_handler);
	$("#btn5").on("click", btn_handler);
	$("#btn6").on("click", btn_handler);
	$("#btn7").on("click", btn_handler);
	$("#btn8").on("click", btn_handler);
	$("#btn9").on("click", btn_handler);
	$("#btn10").on("click", btn_handler);
	$("#btn11").on("click", btn_handler);
	$("#btn12").on("click", call_btn);

	$("#create_phonebook_btn").on('click', create_phonebook_handler);
	
	$("#language").val(localStorage.lang);
	$("#language").on("change", switch_lang_handler);

	$("#dndbutton").on("click", dnd_btn_handler);
	updateDNDButtonImage();

	var contextMenu = {};
	contextMenu["Language"] = createLanguagesContextMenuItem([{shortName: "ru", fullName:"Russian"}, {shortName: "en", fullName:"English"}]);
	contextMenu["Active device"] = createDevicesContextMenuItem();
	contextMenu["Click to dial"] = createClickToDialContextMenuItem();
	contextMenu["sep1"] = "---------";
	
	contextMenu["Quit"] = {name: "Quit"};
	
	drawContextMenu(contextMenu);
	updatePhoneBook();
	localize();
}

function showVMMessages(e){
	var vmbox_id = e.currentTarget.id;
	console.log(vmbox_id);
	var media_list;

	try{
		media_list = JSON.parse(localStorage["vm_media"]);
	}catch(e){
		media_list = [];
	}
	$("#msgtable").empty();
	for ( var i = 0; i < media_list[vmbox_id].messages.length; i++) {
		var new_info_row = create_info_media_row(media_list[vmbox_id].messages[i].from,
							 media_list[vmbox_id].messages[i].caller_id_number,
							 media_list[vmbox_id].messages[i].caller_id_name,
							 vmbox_id,
							 media_list[vmbox_id].messages[i].media_id );
		var new_player_row = create_play_media_row(vmbox_id, media_list[vmbox_id].messages[i].media_id);

		$("#msgtable").append(new_info_row);
		$("#msgtable").append(new_player_row);
	}
}

function create_play_media_row(vmbox_id, media_id){
	var row1, col1, audio, source;
	row1 = document.createElement("tr");
	col1 = document.createElement("td");
	audio = document.createElement("audio");
	audio.style.width = "260px";
	source = document.createElement("source");
	source.src = localStorage["url"] + "v2/accounts/" +
		localStorage["account_id"]+ "/vmboxes/" +
		vmbox_id + "/messages/" + media_id +
		"/raw?auth_token="+ localStorage["authTokens"];
	source.type = "audio/ogg";
	audio.appendChild(source);
	audio.controls = "true";
	col1.appendChild(audio);
	col1.colSpan = 4;
	row1.appendChild(col1);

	return row1;
}

function set_popup_heigth(new_len){
	$("#tabs")[0].style.height = (new_len - 150) + "px";
	$("#messages")[0].style.height = (new_len - 190) + "px";
	$("#phonebook")[0].style.height = (new_len- 190) + "px";
	$("#history")[0].style.height = (new_len- 190) + "px";
}

function create_input_pb_row(){	
	var input_field, col1, col2, col3, input1, input2, image;
	var translate;
	try{
		translate = JSON.parse(localStorage["localization"]);
	}catch(e){
		translate = {
			"pb_name_placeholder": {"message": "name"},
			"pb_phone_placeholder": {"message": "phone number"}
		};
	}
	
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
			phone: $("#pb_new_phone").val() + "" }, ()=>{});
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
	var row, col1, col2, col3, col4, p1, img;
	row = document.createElement("tr");
	col1 = document.createElement("td");
	col2 = document.createElement("td");
	col3 = document.createElement("td");
	col4 = document.createElement("td");
	p1= document.createElement("p");
	img = document.createElement("img");

	p1.innerText = from;
	img.src = "images/remove.png";
	col1.innerText = number;
	col1.appendChild(p1);
	col2.innerText = name;
	col4.appendChild(img);
	col4.style = "text-align:right !important";

	row.appendChild(col1);
	row.appendChild(col2);
	row.appendChild(col3);
	row.appendChild(col4);

	return row;
}

function create_box_row(name, phone, count, is_new, id){
	var row, col1, col2, col3, col4, p1, img;
	row = document.createElement("tr");
	col1 = document.createElement("td");
	col2 = document.createElement("td");
	col3 = document.createElement("td");
	col4 = document.createElement("td");
	p1= document.createElement("p");
	img = document.createElement("img");

	p1.innerText = name;
	img.src = "images/msg_" + (is_new?"new":"old") +  ".png";
	col1.innerText = phone;
	col1.appendChild(p1);
	col2.innerText = count;
	col4.appendChild(img);
	col4.style = "text-align:right !important";

	row.appendChild(col1);
	row.appendChild(col2);
	row.appendChild(col3);
	row.appendChild(col4);
	row.id = id;

	//$("#msgtable").append(row);
	return row;
}

function text_input_handler_phones(e){
	var table = $("#phonebookentries");
	var template = e.currentTarget.value + "";
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
	chrome.runtime.sendMessage({type : "SWITCH_DND"}, ()=>{});	
	window.setTimeout(updateDNDButtonImage, 500);
}

function localize(){
	try{
		var x = JSON.parse(localStorage["localization"]);

		$("#help_why").text(x.help_why.message);
		$("#help_why")[0].title = x.help_why_answer.message;
		$("#help_ask_create_pb").text(x.help_ask_create_pb.message);
		$("#help_ask_create_pb2").text(x.help_ask_create_pb2.message);
		$("#signout_text")[0].innerText = x.signout_text.message;
		//$("#call_tab")[0].title = x.call_tab.message;
		$("#history_tab")[0].title = x.history_tab.message;
		$("#pref_tab")[0].title = x.pref_tab.message;
		$("#destination")[0].placeholder = x.phone_num.message;
		//$("#clicktodial")[0].lastChild.remove();
		//$("#clicktodial")[0].innerHTML += x.clicktodialbox.message;	//broke checkbutton to fuck, dont find different way
		// $("#notifications")[0].lastChild.remove();
		// $("#notifications")[0].innerHTML += x.notificationsbox.message;
		// $("#texttospeech")[0].lastChild.remove();
		// $("#texttospeech")[0].innerHTML += x.texttospeechbox.message;
		//$("#any_phone")[0].innerText = x.any_phone.message;
		// $("#robutton")[0].title = x.robutton.message;
		// $("#cfabutton")[0].title = x.cfabutton.message;
		$("#dndbutton")[0].title = x.dndbutton.message;
		$("#about")[0].innerText = x.about.message;
	}catch(e){};

	//Repair checkboxes
	//$('#clicktodialbox').on('click', (e)=>{	  localStorage["clicktodial"]  = e.target.checked;});
	// $('#notificationsbox').on('click', (e)=>{ localStorage["notification"] = e.target.checked;});
	// $('#texttospeechbox').on('click', (e)=>{  localStorage["texttospeech"] = e.target.checked;});
	// $("#clicktodialbox")[0].checked = localStorage["clicktodial"] == "true";
	// $("#notificationsbox")[0].checked = localStorage["notifications"] == "true";
	// $("#texttospeechbox")[0].checked = localStorage["texttospeech"] == "true";
}

function switch_lang_handler(lang){
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
		switch(error_code){
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
	$("#error_msg").text(message);
	$("#error_msg").fadeIn();
	$("#error_msg").fadeOut(7000);
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
			//icon: "images/" + list[i].shortName +"-flag.png",
			icon: "edit",
			selected: localStorage["lang"] == list[i].shortName,
			events: {
				click: (e)=>{ switch_lang_handler(e.currentTarget.value); }
			}
		};
	}
	
	return langs;
}

function createDevicesContextMenuItem(){
	var devices = JSON.parse(localStorage["devices"]);
	var device_items = {name: "Active device", items: {}};
	
	for(var i in devices) {
		device_items.items[devices[i].num] = {
			name: devices[i].name, 
			type: 'radio', 
			radio: 'radio_dev', 
			value: devices[i].id,
			//icon: "images/" + list[i].shortName +"-flag.png",
			selected: localStorage["active_device"] == devices[i].id,
			events: {
				click: (e)=>{ localStorage["active_device"] = e.currentTarget.value;}}
		};
	}

	return device_items;
};

function drawContextMenu(items){
	$.contextMenu({
		selector: '#options', 
		trigger: 'left',
		// callback: function(key, options) {
		// 	var m = "clicked: " + key;
		// 	window.console && console.log(m) || alert(m); 
		// },
		items: items
	});
}

function createClickToDialContextMenuItem(){
	var ctd_item = {
		name: "Enable Click to Dial",
		type: 'checkbox',
                selected: localStorage["clicktodial"]=="true",
		events: {
			click: (e)=>{ localStorage["clicktodial"] = !(localStorage["clicktodial"] == "true"); }
		}
	};
	
	return ctd_item;
}

document.addEventListener('DOMContentLoaded', restoreTabs);

// function drawDevices(){
// 	console.log("devices drawed.");

// 	$("#devices").on("change", function(dev){
// 		localStorage["active_device"] = dev.currentTarget.selectedOptions[0].id;
// 		console.log("device changed.");
// 		localStorage["devIndex"] = document.getElementById("devices").selectedIndex;
// 	});

// 	document.getElementById("devices").selectedIndex = localStorage["devIndex"];
// }
