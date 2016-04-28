(function($) {
	var objSet = {
		settings: [
			{type: "checkbox", label: "First checkbox", checked: true, id: "first_check_set"},
			{type: "checkbox", label: "Second checkbox", checked: false, id: "second_check_set"},
			{type: "text", label: "First input", value: "Default", id: "first_inp_set", placeholder: "First input"},
			{type: "text", label: "Second input", value: "Default", id: "second_inp_set", placeholder: "Second input"}
		],
		//-^----------- settings - input array with data

		parent: $(".settings__body"),
		block: $(".settings"),
		save: $(".settings__save"),

		render: function() {
			var self = this, template = $("<div>", {class: "settings__items"}), bufItem, bufElem;

			$.each(self.settings, function(i, item) {
				bufElem = $("<input>", {
					id: item.id,
					type: item.type,
					title: item.label
				});

				if (item.type === "checkbox") {
					bufItem = $("<label>", {class: "settings__item", for: item.id});

					$(bufElem).attr({
						class: "settings__check",
						checked: item.checked
					});
				}

				if (item.type === "text") {
					bufItem = $("<div>", {class: "settings__item"});

					$(bufElem).attr({
						class: "settings__inp",
						placeholder: item.placeholder,
						value: item.value
					});
				}

				$(bufItem).append($("<span>", {class: "settings__label", text: item.label}));
				$(bufItem).append(bufElem);
				$(template).append(bufItem);
			});

			self.bindEvents(template, function() {
				$(self.parent).prepend(template);
				$(self.block).height($(self.parent).height() + 60)
			});
		},

		bindEvents: function(template, callback) {
			var self = this;

			$(self.save).on("click", function() {
				$(template).find(".settings__check").each(function(i, item) {
					if (item.type === "checkbox") {
						self.settings[i].checked = item.checked;
					}

					if (item.type === "text") {
						self.settings[i].value = item.value;
					}
				});

				// console.log(self.settings);

				// --------------------------------------------------------- //
				// ---- Place for send our settings to bg or everywhere ---- //
				// --------------------------------------------------------- //
			});

			callback && callback();
		}
	}

	objSet.render();
})(jQuery)