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

var MODULE = "options.js";
var KAZOO = {};

function showMessage(message, fadeOut) {
	$("#status").text(message);
	$("#status").fadeIn();
	if (fadeOut) {
		$("#status").fadeOut(5000);
	}
}

function addConnection(url) {
	var connect = {}, connections, addConnect = true;

	connect[url] = {
		acc: $("#accname").val(),
		user: $("#username").val()
	};

	if (localStorage["connections"] != null) {
		connections = $.parseJSON(localStorage["connections"]);

		$.each(connections, function(i, item) {
			if (i == url && item.acc == connect[url].acc && item.user == connect[url].user) {
				addConnect = false;
				return false;
			}
		});
	} else {
		connections = {};
	}

	if (addConnect) {
		connections[url] = connect[url];
		localStorage["connections"] = JSON.stringify(connections);
	}
}

function signin() {
	var url = ($("#url_select").val() == "new") ? $("#url").val() : $("#url_select").val();
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
		if (localStorage["connectionStatus"] == "signedIn"){
			top.location.assign("tabs.html");

			addConnection(url);
		}

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
	var connections;
	localize();
	$("#url_select").focus();
	$(document).keypress(function(event) {
		if (event.keyCode == 13) {
			$('#signin').trigger('click');
		}
	});

	$(".language__img").on("click", function() {
		$(".language__ul").css("top", "-" + ($(".language__li").size() - 1) * 2 + "rem").toggle(300);
	});
	$(".language__li").on("click", flag_click_handler);

	if (localStorage["connections"] != null) {
		connections = JSON.parse(localStorage["connections"]);

		$.each(connections, function(i, connect) {
			$(".multiselect__select").append($("<option>", {
				value: i,
				text: i
			}).attr("dataacc", connect.acc).attr("datauser", connect.user));
		});
	}

	$(".multiselect__select").on("change", function() {
		if ($(this).val() !== "default") {
			if ($(this).val() === "new") {
				$(this).hide();
				$("#url").val("");
				$("#accname").val("");
				$("#username").val("");
				$("#password").val("");
				$(".multiselect__input").show().focus();
			} else {
				$("#accname").val($('option:selected', this).attr("dataacc"));
				$("#username").val($('option:selected', this).attr("datauser"));
			}
		} else {
			$("#accname").val("");
			$("#username").val("");
			$("#password").val("");
		}
	});
	$(".multiselect__input").on("dblclick", function() {
		$(this).hide();
		$(".multiselect__select").val("default").show().focus();
	});

	var error = localStorage["errorMessage"];
	$("#password").val("");
	if (localStorage["errorMessage"] != undefined && localStorage["errorMessage"] != ""){
		chrome.browserAction.setIcon({path: "images/logo_offline_128x128.png"});
		$("#url").val(localStorage["url"]);
		$("#username").val(localStorage["username"]);
		$("#accname").val(localStorage["accname"]);
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
				chrome.browserAction.setIcon({path: "images/logo_online_128x128.png"});
				top.location.assign("tabs.html");
			}
		} catch (error) {
			$("#settings").show();
			LOGGER.API.error(MODULE,error.message);
		}
	}
}

function flag_click_handler(e){
	$(".language__ul").toggle(300);
	localStorage.lang = e.currentTarget.id.substring(0,2);
	var message = { type : "UPDATE_LOCALIZATION"};
	chrome.runtime.sendMessage(message, ()=>{});
	window.setTimeout(localize, 500);
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

function localize(){
	try{
		var x = JSON.parse(localStorage["localization"]);

		$("#signin_label").text(x.signin_label.message);
		$("#url_select option[value='default']").text(x.choose_url.message);
		$("#url_select option[value='new']").text(x.new_url.message);
		$("#url").attr("placeholder", x.url.message);
		$("#accname").attr("placeholder", x.accname.message);
		$("#username").attr("placeholder", x.username.message);
		$("#password").	attr("placeholder", x.password.message);
		$("#signin").text(x.signin.message);
		$("#about img").attr("title", x.about.message).attr("alt", x.about.message);
	}catch(e){
		console.log(e);
	}
}

// about
document.querySelector('#about').addEventListener('click', showAboutBox);

document.addEventListener('DOMContentLoaded', restoreOptions);
document.querySelector('#signin').addEventListener('click', signin);
