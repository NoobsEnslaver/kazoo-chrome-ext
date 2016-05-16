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

function sendCallMessage(number) {
	window.confirm("Are you sure you want to call " + number + "?")?
		window.postMessage({type: "CALL", text: number}, "*"):"";
}

chrome.runtime.sendMessage(message, function(response) {
	if (response.status == "true") {
		var format1 = "(([+]?)([0-9][0-9]?)((-| )([0-9]{1,3}))((-| )([0-9]{1,4})){2,4})";
		var format2 = "((([2-9][0-8][0-9])|([\(][2-9][0-8][0-9][\)]))(-| )?([2-9][0-9]{2})(-| )?([0-9]{4}))";

		var replacer = new RegExp();
		replacer.compile("(" + format2 + "|" + format1 + ")");
		var treeWalker = document.createTreeWalker(document, NodeFilter.SHOW_TEXT, (node)=> {
			return (node.parentNode.tagName != 'TEXTAREA' && node.textContent.match(replacer))?
				NodeFilter.FILTER_ACCEPT: NodeFilter.FILTER_SKIP;
		}, false);

		var nodes = [];
		while (treeWalker.nextNode()) {
			nodes.push(treeWalker.currentNode);
		}
		console.log("found %o telphone numbers", nodes.length);

		var image = chrome.extension.getURL("images/click2dial.png");
		var replacement = "$1 <img id='clicktocall' src='" + image + "' onClick=\"sendCallMessage('$1');\" />";
		var replacement2= "$1 <img id='clicktocall' src='" + image + "'/>";

		for ( var i = 0; i < nodes.length; i++) {
			var node = nodes[i];
			if (node.parentNode) {
				if(node.parentNode.tagName == 'A')
					node.parentNode.innerHTML = node.parentNode.innerHTML.replace(replacer, replacement2);
				else
					node.parentNode.innerHTML = node.parentNode.innerHTML.replace(replacer, replacement);
			}
		}

		// Links handler
		var targets = Array.from(document.body.getElementsByTagName("a")).filter(
			(x)=>{return (x.href &&
				      x.href.trim().startsWith("tel:") &&
				      x.href.trim().match(replacer));});

		targets.map((x)=>{ var num = x.href.match(replacer);
				   if (num && num.length > 0)
				   {
					   x.addEventListener('click', (e)=>{ sendCallMessage('+' + num[0]);});
					   x.href = '#';
				   }});

		console.log("found %o telphone numbers links", targets.length);

		window.addEventListener("message", (e)=> {
			if (e.source != window) {
				return;
			}
			if (e.data.type && (e.data.type == "CALL")) {
				console.log("Content script received: %o", e.data.text);
				chrome.runtime.sendMessage(e.data, ()=> {});
			}
		});
	}
});


function closeWindowNotifications() {
	$(".call__audio")[0].pause();
	$(".call__audio")[0].currentTime = 0;
	$(".call").filter(function() {return $(this).css("display") != "none";}).toggle(400, function() {
		$(".callup").css("animation", "none");
	});
}
var sumCall = 0;
$("body").append($("<div>", {class: "call"}).load(chrome.extension.getURL("injected.html"), function() {
	sumCall = 0;
	function sendAndClose(message){
		return ()=>{
			chrome.runtime.sendMessage({type: "BLACKHOLE_USER_ACTION", data: message}, (x)=>{});
			closeWindowNotifications();
			sumCall--;
		};
	}

	$("body").on("click", ".call__overlay", sendAndClose("OVERLAY"));
	$("body").on("click", ".callup__btn-take", sendAndClose("TAKE"));
	$("body").on("click", ".callup__btn-info", sendAndClose("VIEW_PROFILE"));
	$("body").on("click", ".callup__btn-reject", sendAndClose("REJECT"));
	$("body").on("mouseover", ".callup",  ()=>{ $(".callup").css("animation", "none");});
	$("body").on("mouseleave", ".callup", ()=>{ $(".callup").css("animation", "blink infinite 1.2s linear");});
	$(".call__audio").attr("src", chrome.extension.getURL("audio1.mp3"));
}));

chrome.runtime.onMessage.addListener((message, sender, callback)=>{
	if (message.sender === "KAZOO" &&
	    message.type === "event") {
		switch (message.data["Event-Name"]) {
		case "CHANNEL_CREATE":
			if (sumCall == 0) {
				sumCall++;				
				$(".callup__number")[0].text = message.data.number;
				$(".callup__name")[0].innerText = (message.data.in_phone_book_name? (message.data.in_phone_book_name + "(" + message.data.name + ")") : message.data.name);
				
				$(".call").filter(function() {return $(this).css("display") == "none";}).toggle(400, function() {
					$(".callup").css("animation", "blink infinite 1.2s linear");
					$(".call__audio")[0].play();
				});
			}
			break;

		case "CHANNEL_ANSWER":
			closeWindowNotifications();
			break;

		case "CHANNEL_DESTROY":
			closeWindowNotifications();
			break;

		default:
			break;
		}
	}
});
