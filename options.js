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

var MODULE = "options.js";
var KAZOO = {};

function showMessage(message, fadeOut) {
	$("#status").text(message);
	$("#status").fadeIn();
	if (fadeOut) {
		$("#status").fadeOut(5000);
	}
}

function signin() {
	var url = $("#url").val();
	localStorage["url"] = (url[url.length-1] == '/')? url: url + '/';
	localStorage["username"] = $("#username").val();
	localStorage["accname"] = $("#accname").val();
	localStorage["credentials"] = CryptoJS.MD5(localStorage["username"] + ":" + $("#password").val()).toString();
	localStorage["clicktodial"] = "true";
	localStorage["notifications"] = "true";
	localStorage["texttospeech"] = "true";
	localStorage["account_id"] = "";
	localStorage["user_id"] = "";
	localStorage["errorMessage"] = "";

	localStorage["connectionStatus"] = "";
	chrome.runtime.sendMessage({type : "BG_RESTART"});
	
	wait(()=>{
		if (localStorage["connectionStatus"] == "signedIn")
			top.location.assign("tabs.html");
		return (localStorage["connectionStatus"] == "signedIn") || (localStorage["connectionStatus"] == "authFailed");
		
	}, { timeout_callback: ()=>{
		showMessage("Connection timeout");
	}});
}

function wait(predicate, options){
	if (predicate()) return;
	
	options = options || {};	
	options.sample_time = options.sample_time || 100;
	options.timeout = isFinite(options.timeout)?(options.timeout - options.sample_time): 3000;
	options.timeout_callback= options.timeout_callback || function(){};
	
	if (options.timeout > 0) {
		window.setTimeout(wait, options.sample_time, predicate, options);
	}else {
		options.timeout_callback();
	}
}

function showGUI(name) {
	$("#dnd").prop("checked", getDoNotDisturb());
	$("#name").text(name);
	$("#settings").hide();
	$("#tabs").show();
}

function restoreOptions() {

	$("#url").focus();
	$(document).keypress(function(event) {
		if (event.keyCode == 13) {
			$('#signin').trigger('click');
		}
	});

	var error = localStorage["errorMessage"];
	if (localStorage["errorMessage"] != undefined && localStorage["errorMessage"] != ""){
		$("#url").val(localStorage["url"]);
		$("#username").val(localStorage["username"]);
		$("#accname").val(localStorage["accname"]);
		$("#password").val("");
		localStorage["connectionStatus"] = "signedOut";
	} else {
		var url = localStorage["url"];
		var username = localStorage["username"];
		var accname = localStorage["accname"];
		if (url) {
			$("#url").val(url);
		}
		if (username) {
			$("#username").val(username);
		}
		if (accname){
			$("#accname").val(accname);
		}
		try {
			if (localStorage["connectionStatus"] == "signedIn") {
				top.location.assign("tabs.html");
			}
		} catch (error) {
			$("#settings").show();
			LOGGER.API.error(MODULE,error.message);
		}
	}
}

function done() {
	window.close();
}

function showAboutBox() {
	localStorage["currentTab"] = "options";
	top.location.assign("about.html");
}

//background error drawer
chrome.runtime.onMessage.addListener((a,b,c)=>{
	if (!a.sender == "KAZOO") return;

	if (a.type == "error") {
		var error_code = a.data.status;
		switch(error_code){
		case 400:
		case 401:
			showMessage("Authorization error.");
			break;

		default:
			showMessage("Unknown error.");
			break;
		}
	}
});

// about
document.querySelector('#about_link_options').addEventListener('click', showAboutBox);

document.addEventListener('DOMContentLoaded', restoreOptions);
document.querySelector('#signin').addEventListener('click', signin);
