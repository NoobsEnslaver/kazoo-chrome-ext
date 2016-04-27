if (localStorage["connectionStatus"] != "signedIn")
	chrome.tabs.update({url: chrome.extension.getURL("sign.html")});

function main(){
	create_fields();
	restore_options();
	$('#save_btn').click(save_options);
	$('#reset_btn').click(restore_options);
}

function save_options(){
	var options = $('form[name=Options]').serializeArray().reduce((obj, item)=>{
		obj[item.name] = item.value;
		return obj;
	}, {});
	storage.set("lang", options["lang"]);
	storage.set("active_device", options["active_device"]);
	storage.set("inboundCallNotificationsEnabled", options["inboundCallNotificationsEnabled"] === "on");
	storage.set("outboundCallNotificationsEnabled", options["outboundCallNotificationsEnabled"] === "on");
	storage.set("system_notification", options["system_notification"] === "on");
	storage.set("onQuickCallNotifications", options["onQuickCallNotifications"] === "on");
	storage.set("clicktodial", options["clicktodial"] === "on");
	storage.set("custom_profile_page", options["custom_profile_page"]);

	chrome.runtime.sendMessage({ type : "UPDATE_LOCALIZATION"}, ()=>{
		chrome.tabs.reload();
	});
}

function create_fields(){
	var opt = document.forms["Options"];
	get_devices().forEach((device)=>{
		opt.elements["devices_list"].appendChild(device);
	});
}

function restore_options(){
	var opt = document.forms["Options"];
	opt.elements["lang"].value = storage.get("lang", "en");
	opt.elements["active_device"].value =storage.get("active_device", "auto");
	opt.elements["inboundCallNotificationsEnabled"].checked = storage.get("inboundCallNotificationsEnabled", true);
	opt.elements["outboundCallNotificationsEnabled"].checked = storage.get("outboundCallNotificationsEnabled", true);
	opt.elements["system_notification"].checked = storage.get("system_notification", true);
	opt.elements["onQuickCallNotifications"].checked = storage.get("onQuickCallNotifications", true);
	opt.elements["clicktodial"].checked = storage.get("clicktodial", true);
	opt.elements["custom_profile_page"].value = storage.get("custom_profile_page", "");
}

function get_devices(){
	var devices = storage.get("devices", {});
	var p, input, result_list = [];
	for(var i in devices) {
		p = document.createElement("P");
		input = document.createElement("INPUT");
		input.type = "radio";
		input.name = "active_device";
		input.value= devices[i].id;
		p.appendChild(input);
		p.innerHTML += devices[i].name;
		result_list.push(p);
	}
	return result_list;
}

var storage = {
	get: function(key, def_val){
		if(typeof(def_val) === "string")
			return localStorage[key] || def_val;

		var value = def_val;
		try{
			value = JSON.parse(localStorage[key]);
		}catch(e){}
		return value;
	},
	set: function(key, val){		
		localStorage[key] = typeof(val) === "string"? val: JSON.stringify(val);
	},
	push: function(key, new_val){
		var old_val = this.get(key, []);
		old_val.push(new_val);
		this.set(key, old_val);
	},
	assign: function(key, val){
		if(typeof(val) !== "object") throw new Error("Assign for Objects only!");
		var old_val = this.get(key, {});
		this.set(key, Object.assign(old_val, val));
	}
};


document.addEventListener('DOMContentLoaded', main);
