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
document.querySelector('#about_link_tabs').addEventListener('click',
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
				}
			}
		});

	// restore current tab
	var currentTab = localStorage["currentTab"];
	if (currentTab == "dialer") {
		$("#tabs").tabs("option", "active", 0);
		$('#destination').focus();
	} else if (currentTab == "history") {
		$("#tabs").tabs("option", "active", 2);
	} else if (currentTab == "preferences") {
		$("#tabs").tabs("option", "active", 3);
	}else if (currentTab == "messages") {
		$("#tabs").tabs("option", "active", 1);
	} else {
		$("#tabs").tabs("option", "active", 0);
		$('#destination').focus();
	}

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

	$("#language").val(localStorage.lang);
	$("#language").on("change", switch_lang_handler);
	
	drawDevices();

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

function localize(){
	try{
		var x = JSON.parse(localStorage["localization"]);
		
		$("#signout_text")[0].innerText = x.signout_text.message;
		$("#call_tab")[0].title = x.call_tab.message;
		$("#history_tab")[0].title = x.history_tab.message;
		$("#pref_tab")[0].title = x.pref_tab.message;
		$("#destination")[0].placeholder = x.phone_num.message;
		$("#clicktodial")[0].lastChild.remove();
		$("#clicktodial")[0].innerHTML += x.clicktodialbox.message;	//broke checkbutton to fuck, dont find different way
		$("#notifications")[0].lastChild.remove();
		$("#notifications")[0].innerHTML += x.notificationsbox.message;
		$("#texttospeech")[0].lastChild.remove();
		$("#texttospeech")[0].innerHTML += x.texttospeechbox.message;
		$("#any_phone")[0].innerText = x.any_phone.message;
		$("#robutton")[0].title = x.robutton.message;
		$("#cfabutton")[0].title = x.cfabutton.message;
		$("#dndbutton")[0].title = x.dndbutton.message;
		$("#about")[0].innerText = x.about.message;
	}catch(e){};

	//Repair checkboxes
	$('#clicktodialbox').on('click', (e)=>{	  localStorage["clicktodial"]  = e.target.checked;});
	$('#notificationsbox').on('click', (e)=>{ localStorage["notification"] = e.target.checked;});
	$('#texttospeechbox').on('click', (e)=>{  localStorage["texttospeech"] = e.target.checked;});
	$("#clicktodialbox")[0].checked = localStorage["clicktodial"] == "true";
	$("#notificationsbox")[0].checked = localStorage["notifications"] == "true";
	$("#texttospeechbox")[0].checked = localStorage["texttospeech"] == "true";
}

function switch_lang_handler(){
	localStorage.lang = $("#language").val();
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

function drawDevices(){
	console.log("devices drawed.");
	var devices = JSON.parse(localStorage["devices"]);

	for(var d in devices) {
		$("#devices").append('<option value=' + devices[d].num + ' id='+ devices[d].id +'>' + devices[d].name  +'</option>');
	};

	$("#devices").on("change", function(dev){
		localStorage["active_device"] = dev.currentTarget.selectedOptions[0].id;
		console.log("device changed.");
		localStorage["devIndex"] = document.getElementById("devices").selectedIndex;
	});

	document.getElementById("devices").selectedIndex = localStorage["devIndex"];
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

document.addEventListener('DOMContentLoaded', restoreTabs);
