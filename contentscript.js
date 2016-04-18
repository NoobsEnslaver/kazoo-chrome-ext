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
var message = {
	type : "IS_CLICK_TO_DIAL_ENABLED"
};
// var messageCallNotification = {
// 	type : "IS_ON_CALL_NOTIFICATION_ENABLED"
// };

function sendCallMessage(number) {
	var message = {
		type : "CALL",
		text : number
	};
	var confirm = window.confirm("Are you sure you want to call " + number + "?");
	if (confirm) {
		window.postMessage(message, "*");
	}
}

chrome.runtime.sendMessage(message, function(response) {
	if (response.status == "true") {
		var international = "(([+]?)([0-9][0-9]?)((-| )([0-9]{1,3}))((-| )([0-9]{1,4})){2,4})";
		var us = "((([2-9][0-8][0-9])|([\(][2-9][0-8][0-9][\)]))(-| )?([2-9][0-9]{2})(-| )?([0-9]{4}))";
		//var us = "((?:[+])?((?=<[0-9\)]) (?=[0-9\(])|(?=<[0-9\)])-(?=[0-9\(])|[0-9]+|[\(\)]){7,})";
		//var us = "((?:[+])?([\(]?[0-9]+[\)]?|[0-9\)]+ [0-9\(]+|[0-9\)]+-[0-9\(]+)){7,}";

		var re = new RegExp();
		re.compile("(" + us + "|" + international + ")");
		var treeWalker = document.createTreeWalker(document, NodeFilter.SHOW_TEXT, function(node) {
			if (node.parentNode.tagName != 'TEXTAREA' && node.textContent.match(re)) {
				return NodeFilter.FILTER_ACCEPT;
			} else {
				return NodeFilter.FILTER_SKIP;
			}
		}, false);

		var nodes = [];

		while (treeWalker.nextNode()) {
			nodes.push(treeWalker.currentNode);
		}
		console.log("found " + nodes.length + " telphone numbers");

		var image = chrome.extension.getURL("images/click2dial.png");
		var replacement = "$1 <img id='clicktocall' src='" + image + "' onClick=\"sendCallMessage('$1');\" />";
		var replacement2= "$1 <img id='clicktocall' src='" + image + "'/>";

		for ( var i = 0; i < nodes.length; i++) {
			var node = nodes[i];
			if (node.parentNode) {
				if(node.parentNode.tagName == 'A')
					node.parentNode.innerHTML = node.parentNode.innerHTML.replace(re, replacement2);
				else
					node.parentNode.innerHTML = node.parentNode.innerHTML.replace(re, replacement);
			}
		}

		// Links handler
		var targets = Array.from(document.body.getElementsByTagName("a")).filter(
			(x)=>{return (x.href &&
				      x.href.trim().startsWith("tel:") &&
				      x.href.trim().match(re));});

		targets.map((x)=>{ var num = x.href.match(re);
				   if (num && num.length > 0)
				   {
					   x.addEventListener('click', (e)=>{ sendCallMessage('+' + num[0]);});
					   x.href = '#';
				   }});

		console.log("found " + targets.length + " telphone number links");

		window.addEventListener("message", function(event) {
			if (event.source != window) {
				return;
			}
			if (event.data.type && (event.data.type == "CALL")) {
				console.log("Content script received: " + event.data.text);
				chrome.runtime.sendMessage(event.data, function(response) {
					console.log(response.status);
				});
			}
		});
	}
});


//chrome.runtime.sendMessage(messageCallNotification, function(response) {
function closeWindowNotifications() {
	$(".call__audio")[0].pause();
	$(".call__audio")[0].currentTime = 0;
	$(".call").filter(function() {return $(this).css("display") != "none";}).toggle(400, function() {
		$(".callup").css("animation", "none");
	});
}

$("body").append($("<div>", {class: "call"}).load(chrome.extension.getURL("injected.html"), function() {
	function sendAndClose(message){
		return ()=>{
			chrome.runtime.sendMessage({type: "BLACKHOLE_USER_ACTION", data: message}, (x)=>{});
			closeWindowNotifications();
		};
	}
	
	$("body").on("click", ".call__overlay",  sendAndClose("OVERLAY"));
	$("body").on("click", ".callup__take",   sendAndClose("TAKE"));
	$("body").on("click", ".callup__reject", sendAndClose("REJECT"));
	$("body").on("mouseover", ".callup",  ()=>{ $(".callup").css("animation", "none");});
	$("body").on("mouseleave", ".callup", ()=>{ $(".callup").css("animation", "blink infinite 1.2s linear");});
	$(".call__audio").attr("src", chrome.extension.getURL("audio1.mp3"));
}));

chrome.runtime.onMessage.addListener((message, sender, callback)=>{
	if (message.sender === "KAZOO" &&
	    message.type === "event") {
		switch (message.data["Event-Name"]) {
		case "CHANNEL_CREATE":
			if (message.data["Call-Direction"] === "outbound" ||
			    message.data["Call-Direction"] === "inbound") { 	// FIXME
				$(".call").filter(function() {return $(this).css("display") == "none";}).toggle(400, function() {
					$(".callup").css("animation", "blink infinite 1.2s linear");
				});
				$(".call__audio")[0].play();
			}
			break;
			
		case "CHANNEL_ANSWER":
			closeWindowNotifications && closeWindowNotifications();
			break;

		case "CHANNEL_DESTROY":
			closeWindowNotifications && closeWindowNotifications();
			break;

		default:
			break;
		}
	}
});
//});
