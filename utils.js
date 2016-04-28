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

function is_too_fast(event_name, timeout){
	timeout = timeout || 1000;
	event_name = event_name || arguments.callee.caller.name + "_last_call";
	var last_time = storage.get(event_name, 0);
	if (Date.now() - last_time < timeout){
		showError({statusText: "Too fast", status: arguments.callee.caller.name});
		console.log("Too fast:" + arguments.callee.caller.name);
		return true;
	}else{
		localStorage[event_name] = Date.now();
		return false;
	}
}


function flatten(o) {
	var prefix = arguments[1] || "", out = arguments[2] || {}, name;
	for (name in o) {
		if (o.hasOwnProperty(name)) {
			typeof o[name] === "object" ? flatten(o[name], prefix + name + '.', out) :
                                out[prefix + name] = o[name];
		}
	}
	return out;
}


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
