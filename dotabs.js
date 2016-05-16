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

var MODULE = "dotabs.js";
if(localStorage["connectionStatus"] != "signedIn") signout(false);

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
	chrome.runtime.sendMessage({type : "GENTLY_OPEN_PAGE", url: "sign.html"}, ()=>{});
	chrome.runtime.sendMessage({type : "BG_RESTART"}, ()=>{});
	window.close();
}

function history_handler(e){
	var tel = $(this).find("td:first-child() span").text();

	chrome.runtime.sendMessage({
		type : "CALL",
		text : tel
	}, ()=>{
		$("#tabs").tabs("option", "active", 0);
		$("#tabs").tabs("option", "active", 2);
	});

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
						if (list[i].type == "outgoing") {
							row = row
								+ "<td><img src='images/outcoming.png '/></td>";
						} else if (list[i].type == "received") {
							row = row
								+ "<td><img src='images/incoming.png'/></td>";
						} else {
							row = row
								+ "<td><img src='images/reject.png'/></td>";
						}
						row = row + "<td><p>" + list[i].name
						+ "</p><span>" + list[i].number + "</span></td>";
						row = row + "<td>"
							+ formatTimestamp(list[i].time)
							+ "</td>";
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
		$("#tabs").tabs("option", "active", 1);
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
			console.log(e.pageY);
			if (e.pageY < 250 || e.pageY > 570) return;
			var new_len = (e.pageY - 80) ;
			set_popup_heigth(new_len);
			localStorage["popup_heigth"] = new_len;
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

	$(".btn_added:not(#btn12)").on("click", btn_handler);
	$("#btn12").on("click", call_btn);
	$("#destination").on('keydown', function(e) {
		if (e.which == 13) call_btn();
	});

	$("#create_phonebook_btn").on('click', create_phonebook_handler);

	$("#dndbutton").on("click", dnd_btn_handler);
	updateDNDButtonImage();

	$("#options").on("click", ()=>{
		chrome.runtime.sendMessage({type : "GENTLY_OPEN_PAGE", url: "options.html"}, ()=>{});
		window.close();
	});

	updatePhoneBook();
	localize();
}


function showVMMessages(e){
	var vmbox_id = e.currentTarget.id;
	var media_list = storage.get("vm_media", {});

	$("#msgtable").empty();
	if(!media_list[vmbox_id]) return;
	if (media_list[vmbox_id].length == 0) {
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
		for ( var i = 0; i < media_list[vmbox_id].length; i++) {
			var new_info_row = create_info_media_row(media_list[vmbox_id][i].caller_id_name,
								 "", // media_list[vmbox_id][i].from,
								 media_list[vmbox_id][i].caller_id_number,
								 vmbox_id,
								 media_list[vmbox_id][i].media_id );
			var new_player_row = create_play_media_row(vmbox_id, media_list[vmbox_id][i].media_id);

			$(new_info_row).append(new_player_row);
			$("#msgtable").append(new_info_row);
		}
	}
	$("#msgtable").off("click", ".mes__row");
	$("#msgtable").on("click", ".mes__row", function() {
		audio = $(this).find("audio");
		$(audio)[0].pause();
		$(audio)[0].currentTime = 0;
		$(audio).closest(".mes__audio").toggle(300);
	});

	if (storage.get("vm_boxes", []).length > 1) {
		$("#msgtable").append("<div class='back'>Back</div>");
		$(".back").one("click", function() {
			$("#msgtable").off("click", ".mes__row");
			$("#tabs").tabs("option", "active", 1);
			$("#tabs").tabs("option", "active", 0);
		});
	}
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
	$(input1).attr("class", "input input-phonebook");
	input1.placeholder = translate["pb_name_placeholder"].message;
	input1.size=15;
	input2.id = "pb_new_phone";
	$(input2).attr("class", "input input-phonebook");
	input2.placeholder = translate["pb_phone_placeholder"].message;
	input2.size=15;
	image.src = "images/add.png";
	image.onclick = (e)=>{
		if ($("#pb_new_name").val() !== "" && $("#pb_new_phone").val() !== "") {
			var row = create_default_pb_row($("#pb_new_name").val(),  $("#pb_new_phone").val(), Math.random());
			$("#phonebookentries").append(row);
			chrome.runtime.sendMessage({
				type: "PHONE_BOOK_ADD_ENTRY",
				name: $("#pb_new_name").val(),
				phone: $("#pb_new_phone").val() + ""
			}, (e)=>{
				var event = new KeyboardEvent('input');
				$("#pb_new_name").val("");
				$("#pb_new_phone").val("");
				document.querySelector('#pb_new_name').dispatchEvent(event);
				document.querySelector('#pb_new_phone').dispatchEvent(event);
			});
		}
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
	var text = "";
	table.children().children().map((index, object)=>{
		if(index == 0) return;
		text = object.childNodes[0].childNodes[0].textContent;
		if (text.search(template) == -1) {
			object.style.visibility = "hidden";
		} else {
			object.style.visibility = "visible";
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
	$(img).attr("src", "images/remove.png").css("width", "auto");
	$(img).on("click", (e)=>{
		if (confirm("Delete voicemail from " + name + "?")) {
			chrome.runtime.sendMessage({
				type: "VOICE_MAIL_DELETE_ENTRY",
				data: {media_id: media_id,
				       vmbox_id: box_id}
			});
			var old_state = storage.get("vm_media", {});
			old_state[box_id] = old_state[box_id].filter((x)=>{ return x.media_id != media_id;});
			storage.set("vm_media", old_state);
			e.currentTarget.parentNode.parentNode.remove();
		}
	});
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
	$(img).attr("src", "images/msg_" + (is_new ? "new.jpg" : (count > 0 ? "not_empty.png" : "empty.png")));
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
	var text = "";
	var template = e.currentTarget.value + "";
	template = template.replace("+", "\\+");
	table.children().children().map((index, object)=>{
		if(index == 0) return;
		text = object.childNodes[1].childNodes[0].textContent;
		if (text.search(template) == -1) {
			object.style.visibility = "hidden";
		} else {
			object.style.visibility = "visible";
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
		if (confirm("Do you want to delete '" + $("#"+ e.currentTarget.id)[0].parentNode.parentNode.childNodes[0].childNodes[0].innerText + "' ?")) {
			e.currentTarget.parentNode.parentNode.remove();
			chrome.runtime.sendMessage({
				type : "PHONE_BOOK_REMOVE_ENTRY",
				entry_id: e.currentTarget.id }, ()=>{});
		}
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
	chrome.runtime.sendMessage({type : "SWITCH_DND"}, ()=>{});
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
		console.log(MODULE + "Localization error: %o", e);
	};
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
			//showMessage(a.data.statusText + " (" + a.data.status  + ")");
			console.log(a);
			break;
		}
	} else if (a.type == "action") {
		switch(a.data.action){
		case "update_DND_icon":
			updateDNDButtonImage();
			break;

		default:
			//showMessage("Unknown action " + a.data.action);
			console.log(a);
			break;
		}
	}
});


// retrieve stored name
$("#name").text(localStorage["name"]);

// signout
document.querySelector('#signout').addEventListener('click', function() {
	signout(true);
});

// about
document.querySelector('#about').addEventListener('click',
		showAboutBox);

document.addEventListener('DOMContentLoaded', restoreTabs);
