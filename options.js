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
    localStorage["url"] = $("#url").val() + 'v2/';
    localStorage["username"] = $("#username").val();
    localStorage["accname"] = $("#accname").val();
    localStorage["credentials"] = CryptoJS.MD5(localStorage["username"] + ":" + $("#password").val()).toString();
    localStorage["clicktodial"] = "true";
    localStorage["notifications"] = "true";
    localStorage["texttospeech"] = "true";
    localStorage["account_id"] = "";
    localStorage["user_id"] = "";
    localStorage["errorMessage"] = "";

    function logout()
    {
	localStorage["connectionStatus"] = "signedOut";
    }
    
    var kazoosdk_options = {
	apiRoot: localStorage["url"],

	onRequestStart: function(request, requestOptions) {
	    LOGGER.API.log(MODULE,"Request started: " + request);
	},
	onRequestEnd: function(request, requestOptions) {
	    LOGGER.API.log(MODULE,"Request ended: " + request);
	},
	onRequestError: function(error, requestOptions) {
	    if(requestOptions.generateError !== false) {
		LOGGER.API.log(MODULE,"Request error: " + error.status + " " + error.status.text);
	    }
	}
    };
    KAZOO = $.getKazooSdk(kazoosdk_options);
    
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
		    LOGGER.API.log(MODULE,"User name: " + data.data.name);
		    localStorage["name"] = data.data.name;
		    localStorage["connectionStatus"] = "signedIn";
		    chrome.browserAction.setIcon({path: "images/logo_wait_128x128.png"});

		    //localStorage["restartRequired"] = "true";
		    localStorage["errorMessage"]="";
		    top.location.assign("tabs.html");		    
		    
		    chrome.runtime.sendMessage({type : "BG_RESTART"}, ()=>{});
		    //top.location.assign("restart.html");
		},
		error: function(data, status) {
		    showMessage("Invalid credentials. Please verify the information is correct and try again.");
		    console.log('Error data:', data.data);
		    LOGGER.API.error(MODULE, data.data);
		    localStorage["connectionStatus"]= "offline";
		    localStorage["restartRequired"] = "false";
		    localStorage["errorMessage"] = data.data;
		    chrome.browserAction.setIcon({path: "images/logo_offline_128x128.png"});

		    showMessage("Invalid credentials. Please verify the information is correct and try again.");
		},
		generateError: true
            });
	}
    });

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
	console.log("1");
	showMessage(error);
	$("#url").val(localStorage["url"]);
	$("#username").val(localStorage["username"]);
	$("#password").val("");
	localStorage["connectionStatus"] = "signedOut";
    }
    else if (localStorage["restartRequired"] == "true") {
	//top.location.assign("restart.html");
	//console.log("2");
    } else {
	console.log("3");
	var url = localStorage["url"];
	var username = localStorage["username"];
	if (url) {
	    $("#url").val(url);
	}
	if (username) {
	    $("#username").val(username);
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


// about
document.querySelector('#about_link_options').addEventListener('click', showAboutBox);

document.addEventListener('DOMContentLoaded', restoreOptions);
document.querySelector('#signin').addEventListener('click', signin);
