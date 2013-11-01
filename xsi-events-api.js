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

var LOG_PREFIX = 'xsi-events-api|';
var XML_HEADER = '<?xml version="1.0" encoding="UTF-8"?>';
var HEARTBEAT_INTERVAL = 15000;
var channelId = '';
var mainXhr = null;
var heartbeatIntervalId = null;
var state = 'disconnected';
var hostIndex = -1;
var channelSetId = 'broadworks4chromechannelset';
var applicationId = 'broadworks4chrome';
var hosts = [];
var credentials = '';
var username = '';

self.addEventListener('message', function(e) {
	switch (e.data.cmd) {
	case 'init':
		if (state == 'disconnected') {
			log('intializing');
			hosts = e.data.config.hosts;
			username = e.data.config.username;
			credentials = e.data.config.credentials;
		}
		break;
	case 'start':
		if (state == 'disconnected') {
			log('starting');
			connect();
		}
		break;
	case 'stop':
		log('stopping');
		mainXhr.abort();
		break;
	}
}, false);

function connect() {
	log('sending add channel request');
	state = 'connecting';
	hostIndex++;
	if (hostIndex == hosts.length) {
		hostIndex = 0;
	}
	mainXhr = new XMLHttpRequest();
	var index = 0;
	var url = hosts[hostIndex]
			+ '/com.broadsoft.async/com.broadsoft.xsi-events/v2.0/channel';
	mainXhr.open('POST', url, true);
	mainXhr.onreadystatechange = function() {
		var chunk = mainXhr.responseText.substring(index,
				mainXhr.responseText.length);
		index = mainXhr.responseText.length;
		var tokens = chunk.split(XML_HEADER);
		for ( var i = 0; i < tokens.length; i++) {
			if (tokens[i] != '') {
				process(tokens[i]);
			}
		}
	};
	mainXhr.onloadend = function() {
		log('sending disconnected message');
		channelId = '';
		clearInterval(heartbeatIntervalId);
		state = 'disconnected';
		// this is the only place that should send a disconnected message
		sendMessage(state, this.status);
	};

	var request = XML_HEADER;
	request = request + '<Channel xmlns="http://schema.broadsoft.com/xsi">';
	request = request + '<channelSetId>' + channelSetId + '</channelSetId>';
	request = request + '<priority>1</priority>';
	request = request + '<weight>100</weight>';
	request = request + '<expires>3600</expires>';
	request = request + '<applicationId>broadworks4chrome</applicationId>';
	request = request + '</Channel>';

	mainXhr.setRequestHeader('Authorization', 'Basic ' + credentials);
	mainXhr.send(request);
}

function process(chunk) {
	log('received data: ' + chunk);
	if (chunk.indexOf('<Channel ') >= 0) {
		channelId = getTagValue('channelId', chunk);
		log('channelId: ' + channelId);
		heartbeatIntervalId = setInterval(heartbeat, HEARTBEAT_INTERVAL);
		status = 'connected';
		addEventSubscription(username, "Standard Call");
		addEventSubscription(username, "Do Not Disturb");
		addEventSubscription(username, "Remote Office");
		addEventSubscription(username, "Call Forwarding Always");
	} else if (chunk.indexOf('<ChannelHeartBeat ') >= 0) {
	} else if (chunk.indexOf('SubscriptionTerminatedEvent') >= 0) {
		// don't handle these explicitly, just wait for the channel to terminate
		// since we won't send a event response
	} else if (chunk.indexOf('ChannelTerminatedEvent') >= 0) {
		// nothing to do here, mainXhr will return after this and the disconnect
		// message will be sent to background page
	} else if (chunk.indexOf('<xsi:Event ') >= 0) {
		var eventId = getTagValue('xsi:eventID', chunk);
		sendEventResponse(eventId);
		var eventType = getEventType(chunk);
		log('eventType: ' + eventType);
		switch (eventType) {
		case 'DoNotDisturbEvent':
		case 'CallForwardingAlwaysEvent':
		case 'RemoteOfficeEvent':
			var active = getTagValue('xsi:active', chunk);
			sendMessage(eventType, active);
			break;
		case 'CallSubscriptionEvent':
		case 'CallOriginatedEvent':
		case 'CallReceivedEvent':
		case 'CallAnsweredEvent':
		case 'CallReleasedEvent':
		case 'CallHeldEvent':
		case 'CallRetrievedEvent':
		case 'CallUpdatedEvent':
			var calls = parseCalls(chunk);
			sendMessage(eventType, calls);
			break;
		}
	}
}

function heartbeat() {
	if (channelId != '') {
		log('sending channel heartbeat');
		var url = hosts[hostIndex] + '/com.broadsoft.xsi-events/v2.0/channel/'
				+ channelId + '/heartbeat';
		send('PUT', url, null, true);
	}
}

function send(type, url, data, abortOnError) {
	// send XSI-Events requests and abort mainXhr on heart-beat errors
	// we will use that to trigger disconnect messages
	// error on all other requests are ignored, as failed event responses will
	// eventually cause mainXhr to end
	log('sending ' + type + ' to ' + url);
	var xhr = new XMLHttpRequest();
	xhr.open(type, url, true);
	if (abortOnError) {
		xhr.onloadend = function() {
			if (this.status != 200) {
				log('aborting main xhr');
				mainXhr.abort();
			}
		};
	}
	xhr.setRequestHeader('Authorization', 'Basic ' + credentials);
	xhr.send(data);
}

function sendMessage(type, value) {
	self.postMessage({
		type : type,
		value : value
	});
}

function log(message) {
	var now = new Date();
	var year = now.getFullYear();
	var month = now.getMonth() + 1;
	var day = now.getDate();
	var hour = now.getHours();
	var minute = now.getMinutes();
	var second = now.getSeconds();
	if (month.toString().length == 1) {
		month = '0' + month;
	}
	if (day.toString().length == 1) {
		day = '0' + day;
	}
	if (hour.toString().length == 1) {
		hour = '0' + hour;
	}
	if (minute.toString().length == 1) {
		minute = '0' + minute;
	}
	if (second.toString().length == 1) {
		second = '0' + second;
	}
	var timestamp = year + '/' + month + '/' + day + ' ' + hour + ':' + minute
			+ ':' + second;
	sendMessage('log', LOG_PREFIX + timestamp + '|' + message);
}

function getTagValue(tag, data) {
	var ret = '';
	var i = data.indexOf('<' + tag + '>');
	var j = data.indexOf('</' + tag + '>');
	if (i != -1 && j != -1 && i < j) {
		ret = data.substring(i + tag.length + 2, j);
	}
	return ret;
}

function getAttrValue(attr, data) {
	var ret = '';
	var i = data.indexOf(attr);
	if (i != -1){
		j = data.indexOf('"',i + attr.length +2);
		ret = data.substring(i + attr.length + 2, j);
	}
	return ret;
}

function getEventType(xml) {
	var type = '';
	var i = xml.indexOf('<xsi:eventData xsi1:type="');
	if (i != -1) {
		var j = xml.indexOf('"', i + 26);
		if (j > i) {
			type = xml.substring(i + 26, j);
			type = type.replace('xsi:', '');
		}
	}
	return type;
}

function parseCalls(xml) {
	var calls = new Array();
	var call = getTagValue('xsi:call', xml);
	while (call != '') {
		var callId = getTagValue('xsi:callId', call);
		var personality = getTagValue('xsi:personality', call);
		var state = getTagValue('xsi:state', call);
		var remoteParty = getTagValue('xsi:remoteParty', call);
		var name = getTagValue('xsi:name', remoteParty);
		var number = getTagValue('xsi:address', remoteParty);
		var countryCode = getAttrValue('countryCode',remoteParty);
		number = number.replace("tel:","").replace("+"+ countryCode,"+"+ countryCode+ "-");		
		calls[callId] = {
			personality : personality,
			state : state,
			name : name,
			number : number,
			countryCode: countryCode
		};
		xml = xml.substring(xml.indexOf('</xsi:call>') + 11);
		call = getTagValue('xsi:call', xml);
	}
	return calls;
}

function addEventSubscription(targetId, event) {
	var url = hosts[hostIndex] + "/com.broadsoft.xsi-events/v2.0/user/"
			+ username;
	var data = XML_HEADER;
	data = data + "<Subscription xmlns=\"http://schema.broadsoft.com/xsi\">";
	data = data + "<subscriberId>" + username + "</subscriberId>";
	data = data + "<targetIdType>User</targetIdType>";
	data = data + "<targetId>" + targetId + "</targetId>";
	data = data + "<event>" + event + "</event>";
	data = data + "<expires>3600</expires>";
	data = data + "<channelSetId>" + channelSetId + "</channelSetId>";
	data = data + "<applicationId>" + applicationId + "</applicationId>";
	data = data + "</Subscription>";
	send("POST", url, data);
}

function sendEventResponse(eventId) {
	var url = hosts[hostIndex]
			+ "/com.broadsoft.xsi-events/v2.0/channel/eventresponse";
	var data = XML_HEADER;
	data = data + "<EventResponse xmlns=\"http://schema.broadsoft.com/xsi\">";
	data = data + "<eventID>" + eventId + "</eventID>";
	data = data + "<statusCode>200</statusCode>";
	data = data + "<reason>OK</reason>";
	data = data + "</EventResponse>";
	send("POST", url, data);
}