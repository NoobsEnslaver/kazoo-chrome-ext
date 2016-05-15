if (localStorage["connectionStatus"] != "signedIn") {
	chrome.tabs.update({url: chrome.extension.getURL("sign.html")});
}

function main(){
	localize();
	restore_options();
	$("#save_btn").click(save_options);
	$("#reset_btn").click(restore_options);
}

function localize(){
	setLocalize();
	var opt = document.forms["Options"];
	var dictionary = storage.get("localization", {});

	$("#lang_text").text(dictionary["lang"].message);
	$("#info").text(dictionary["info"].message);
	$("#first_name").attr("placeholder", dictionary["first_name"].message);
	$("#last_name").attr("placeholder", dictionary["last_name"].message);
	$("#birthday").attr("placeholder", dictionary["birthday"].message);
	$("#tel").attr("placeholder", dictionary["tel"].message);
	$("#email").attr("placeholder", dictionary["email"].message);
	$("#address").attr("placeholder", dictionary["address"].message);
}

function setLocalize() {
	var dictionary = storage.get("localization", {}), name;
	$(".input").each((i, item)=>{
		if (typeof dictionary[item.name] === "undefined" || typeof dictionary[item.name].message === "undefined") {
			name = item.name || item.id;
			dictionary[name] = {};
			dictionary[name].message = $(item).attr("placeholder") || $(item).text();
		}
	});
	storage.set("localization", dictionary);
}

function save_options(){
	if ($("#first_name").val() !== "" && $("#tel").val() !== "") {
		chrome.runtime.sendMessage({
			type: "PHONE_BOOK_ADD_ENTRY",
			name: $("#first_name").val(),
			last_name: $("#last_name").val(),
			birthday: $("#birthday").val(),
			phone: $("#tel").val(),
			email: $("#email").val(),
			address: $("#address").val()
		}, (e)=>{});
	}
}

function restore_options(){
	var opt = document.forms["Options"];
	opt.elements["lang"].value = storage.get("lang", "ru");

	$(opt.elements["lang"]).on("change", function() {
		storage.set("lang", $(this).val());
		console.log($(this).val());
		chrome.runtime.sendMessage({ type : "UPDATE_LOCALIZATION"}, ()=>{
			chrome.tabs.reload();
		});
	})
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


document.addEventListener("DOMContentLoaded", main);