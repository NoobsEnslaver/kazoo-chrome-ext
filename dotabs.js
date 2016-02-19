/* 
 Copyright 2016, Siplabs, Inc.
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

// Event Listeners
// call history
$("#calllogentries").disableSelection();
$("#calllogentries").on("dblclick", "tr", function(e) {
	e.preventDefault();
	var number = $(this).attr("id").replace(/calllogentry.*_/g, "");
});

// signout
document.querySelector('#signout').addEventListener('click', function() {
	signout(true);
});

// about
document.querySelector('#about_link_tabs').addEventListener('click',
							    showAboutBox);

// Click to dial checkbox
document.querySelector('#clicktodialbox').addEventListener('click', function() {
	var clicktodial = $("#clicktodialbox").prop("checked");
	localStorage["clicktodial"] = clicktodial;
});

// Notifications checkbox
document.querySelector('#notificationsbox').addEventListener('click',
							     function() {
								     var notifications = $("#notificationsbox").prop("checked");
								     localStorage["notifications"] = notifications;
							     });

// Text to speech checkbox
document.querySelector('#texttospeechbox').addEventListener('click',
							    function() {
								    var texttospeech = $("#texttospeechbox").prop("checked");
								    localStorage["texttospeech"] = texttospeech;
							    });


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
		localStorage["url"] = "";
		localStorage["username"] = "";
		localStorage["clicktodial"] = "";
		localStorage["notifications"] = "";
		localStorage["texttospeech"] = "";
		localStorage["errorMessage"] = "";
	}
	chrome.browserAction.setIcon({path: "images/logo_offline_128x128.png"});
	top.location.assign("options.html");    
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
						msg_list = JSON.parse(localStorage["voice_mails"]);	
					}catch(e){
						msg_list = [];
					}
					
					$("#msgtable").empty();
					for ( var i = 0; i < msg_list.length; i++) {
						var row = "<tr id=calllogentry'" + i + "_" + msg_list[i].name + "'>";
						row = row + "<td><p>" + msg_list[i].name + "</p>" + msg_list[i].mailbox + "</td>";
						row = row + "<td>" + msg_list[i].messages + "</td>" + "<td></td>";

						if (msg_list[i].old) {
							row = row + "<td style=\"text-align:right !important;\"><img src='images/msg_old.png '/></td>";
						} else {
							msg_list[i].old = true;
							row = row + "<td style=\"text-align:right !important;\"><img src='images/msg_new.png'/></td>";
						}

						localStorage["voice_mails"] = JSON.stringify(msg_list);
						$("#msgtable").append(row);
					}
					
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




	var clicktodial = localStorage["clicktodial"];
	if (clicktodial == "true") {
		$("#clicktodialbox").prop('checked', true);
	} else {
		$("#clicktodialbox").prop('checked', false);
	}

	var notifications = localStorage["notifications"];
	if (notifications == "true") {
		$("#notificationsbox").prop('checked', true);
	} else {
		$("#notificationsbox").prop('checked', false);
	}

	var texttospeech = localStorage["texttospeech"];
	if (texttospeech == "true") {
		$("#texttospeechbox").prop('checked', true);
	} else {
		$("#texttospeechbox").prop('checked', false);
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

	drawDevices();

	localize();
}

function localize(){
	$("#signout_text")[0].innerText = chrome.i18n.getMessage("signout_text");
	$("#call_tab")[0].title = chrome.i18n.getMessage("call_tab");
	$("#history_tab")[0].title = chrome.i18n.getMessage("history_tab");
	$("#pref_tab")[0].title = chrome.i18n.getMessage("pref_tab");
	$("#destination")[0].placeholder = chrome.i18n.getMessage("phone_num");
	$("#clicktodial")[0].innerHTML += chrome.i18n.getMessage("clicktodialbox");
	$("#notifications")[0].innerHTML += chrome.i18n.getMessage("notificationsbox");
	$("#texttospeech")[0].innerHTML += chrome.i18n.getMessage("texttospeechbox");
	$("#any_phone")[0].innerText = chrome.i18n.getMessage("any_phone");
	$("#robutton")[0].title = chrome.i18n.getMessage("robutton");
	$("#cfabutton")[0].title = chrome.i18n.getMessage("cfabutton");
	$("#dndbutton")[0].title = chrome.i18n.getMessage("dndbutton");

}

function btn_handler(e)
{
	$("#destination")[0].value += e.currentTarget.textContent;
}

function call_btn()
{
	var message = {
		type : "CALL",
		text : $("#destination")[0].value
	};

	chrome.runtime.sendMessage(message, ()=>{});
}

function drawDevices()
{
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

document.addEventListener('DOMContentLoaded', restoreTabs);
