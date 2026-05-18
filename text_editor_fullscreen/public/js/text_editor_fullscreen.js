frappe.provide("frappe.ui.form.ControlTextEditor");

// Store original class
const OriginalTextEditor = frappe.ui.form.ControlTextEditor;

// Extend the TextEditor control
frappe.ui.form.ControlTextEditor = class CustomTextEditor extends OriginalTextEditor {
	make_wrapper() {
		super.make_wrapper();
	}

	make_input() {
		super.make_input();
		this.is_fullscreen = false;
	}

	make() {
		super.make();
		
		// Add fullscreen button after quill is initialized
		if (this.quill) {
			setTimeout(() => {
				this.add_fullscreen_button();
			}, 100);
		}
	}

	set_formatted_input(value) {
		super.set_formatted_input(value);
		
		// Re-add fullscreen button after value changes
		setTimeout(() => {
			this.add_fullscreen_button();
			this.add_fullscreen_button_to_disp_area();
		}, 100);
	}

	add_fullscreen_button_to_disp_area() {
		const $disp_area = this.$wrapper.find(".control-value.like-disabled-input");
		if (!$disp_area.length || $disp_area.find(".ql-fullscreen-readonly").length) return;
		
		if (!this.value || this.value.trim() === "") return;
		
		const $fullscreen_btn = $(`
			<button class="ql-fullscreen-readonly" type="button" title="${__('View Fullscreen')}">
				<svg class="icon icon-sm">
					<use href="#icon-expand"></use>
				</svg>
			</button>
		`);
		
		$fullscreen_btn.on("click", (e) => {
			e.preventDefault();
			e.stopPropagation();
			this.show_fullscreen_readonly();
		});
		
		$disp_area.css("position", "relative").append($fullscreen_btn);
		
		let mouseMoveTimeout = null;
		const showButton = () => $fullscreen_btn.addClass("visible");
		const hideButton = () => $fullscreen_btn.removeClass("visible");
		
		$disp_area.on("mousemove", () => {
			if (mouseMoveTimeout) clearTimeout(mouseMoveTimeout);
			showButton();
			mouseMoveTimeout = setTimeout(hideButton, 2000);
		});
		
		$disp_area.on("mouseenter", showButton);
		$disp_area.on("mouseleave", () => {
			if (mouseMoveTimeout) clearTimeout(mouseMoveTimeout);
			hideButton();
		});
		
		$fullscreen_btn.on("mouseenter", () => {
			if (mouseMoveTimeout) clearTimeout(mouseMoveTimeout);
			showButton();
		});
	}

	add_fullscreen_button() {
		// Remove existing buttons first
		this.$wrapper.find(".ql-fullscreen, .ql-fullscreen-readonly").remove();
		
		if (!this.quill) return;
		
		const is_read_only = this.df.read_only || !this.quill.isEnabled();
		
		if (is_read_only) {
			const $container = this.$wrapper.find(".ql-container");
			if (!$container.length) return;
			
			const $fullscreen_btn = $(`
				<button class="ql-fullscreen-readonly" type="button" title="${__('Fullscreen')}">
					<svg class="icon icon-sm">
						<use href="#icon-expand"></use>
					</svg>
				</button>
			`);
			
			$fullscreen_btn.on("click", (e) => {
				e.preventDefault();
				e.stopPropagation();
				this.toggle_fullscreen();
			});
			
			$container.css("position", "relative").append($fullscreen_btn);
			
			let mouseMoveTimeout = null;
			const showButton = () => $fullscreen_btn.addClass("visible");
			const hideButton = () => $fullscreen_btn.removeClass("visible");
			
			$container.on("mousemove", () => {
				if (mouseMoveTimeout) clearTimeout(mouseMoveTimeout);
				showButton();
				mouseMoveTimeout = setTimeout(hideButton, 2000);
			});
			
			$container.on("mouseenter", showButton);
			$container.on("mouseleave", () => {
				if (mouseMoveTimeout) clearTimeout(mouseMoveTimeout);
				hideButton();
			});
			
			$fullscreen_btn.on("mouseenter", () => {
				if (mouseMoveTimeout) clearTimeout(mouseMoveTimeout);
				showButton();
			});
		} else {
			// For editable fields
			const $toolbar = this.$wrapper.find(".ql-toolbar");
			if (!$toolbar.length) return;
			
			// Make sure toolbar has relative positioning
			$toolbar.css({
				"position": "relative",
				"padding-right": "40px"
			});
			
			const $fullscreen_btn = $(`
				<button class="ql-fullscreen" type="button" title="${__('Fullscreen')}">
					<svg class="icon icon-sm">
						<use href="#icon-expand"></use>
					</svg>
				</button>
			`);
			
			$fullscreen_btn.on("click", (e) => {
				e.preventDefault();
				e.stopPropagation();
				this.toggle_fullscreen();
			});
			
			$toolbar.append($fullscreen_btn);
		}
	}

	get_quill_toolbar() {
		return this.quill_container?.prev(".ql-toolbar");
	}

	toggle_fullscreen() {
		if (this.is_fullscreen) {
			this.exit_fullscreen();
		} else {
			this.enter_fullscreen();
		}
	}

	is_app_full_width() {
		return document.body.classList.contains("full-width");
	}

	apply_fullscreen_modal_width($modal) {
		$modal.toggleClass("tefs-app-full-width", this.is_app_full_width());
	}

	bind_fullscreen_width_toggle($modal) {
		$(document.body).on("toggleFullWidth.tefs-fullscreen", () => {
			this.apply_fullscreen_modal_width($modal);
		});
	}

	unbind_fullscreen_width_toggle() {
		$(document.body).off("toggleFullWidth.tefs-fullscreen");
	}

	destroy_fullscreen_modal() {
		this.unbind_fullscreen_width_toggle();
		this.$fullscreen_modal?.remove();
		this.$fullscreen_modal = null;
	}

	show_fullscreen_readonly() {
		if (!this.value) return;

		this.$fullscreen_modal = $(`
			<div class="modal fade show text-editor-fullscreen-modal" style="display: block;">
				<div class="modal-dialog modal-lg">
					<div class="modal-content">
						<div class="modal-header">
							<h5 class="modal-title">${this.df.label || __('Document Content')}</h5>
							<button type="button" class="btn-close">
								<svg class="icon icon-sm">
									<use href="#icon-close"></use>
								</svg>
							</button>
						</div>
						<div class="modal-body">
							<div class="ql-container ql-snow">
								<div class="ql-editor read-mode" style="height: calc(100vh - 200px); overflow-y: auto;">
									${this.value}
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		`).appendTo(document.body);

		this.apply_fullscreen_modal_width(this.$fullscreen_modal);
		this.bind_fullscreen_width_toggle(this.$fullscreen_modal);

		const close_readonly_modal = () => {
			this.destroy_fullscreen_modal();
			$(document).off("keydown.fullscreen-readonly");
		};

		this.$fullscreen_modal.find(".btn-close").click(close_readonly_modal);

		this.$fullscreen_modal.click((e) => {
			if ($(e.target).hasClass("text-editor-fullscreen-modal")) {
				close_readonly_modal();
			}
		});

		$(document).on("keydown.fullscreen-readonly", (e) => {
			if (e.key === "Escape") {
				close_readonly_modal();
			}
		});
	}

	enter_fullscreen() {
		this.is_fullscreen = true;
		
		this.$toolbar = this.get_quill_toolbar();
		this.original_parent = this.quill_container.parent();
		this.original_height = this.quill_container.find(".ql-editor").css("height");
		const is_read_only = this.df.read_only || !this.quill.isEnabled();

		this.$fullscreen_modal = $(`
			<div class="modal fade show text-editor-fullscreen-modal" style="display: block;">
				<div class="modal-dialog modal-lg">
					<div class="modal-content">
						<div class="modal-header">
							<h5 class="modal-title">${this.df.label || __('Document Content')}</h5>
							<button type="button" class="btn-close">
								<svg class="icon icon-sm">
									<use href="#icon-close"></use>
								</svg>
							</button>
						</div>
						<div class="modal-body"></div>
					</div>
				</div>
			</div>
		`).appendTo(document.body);

		this.apply_fullscreen_modal_width(this.$fullscreen_modal);
		this.bind_fullscreen_width_toggle(this.$fullscreen_modal);

		const $modal_body = this.$fullscreen_modal.find(".modal-body");
		if (this.$toolbar?.length) {
			$modal_body.append(this.$toolbar);
		}
		$modal_body.append(this.quill_container);

		this.quill_container.find(".ql-editor").css({
			"height": "calc(100vh - 200px)",
			"max-height": "none"
		});

		if (this.$toolbar?.length) {
			this.$toolbar.show();
			if (is_read_only) {
				this.$toolbar.find("button:not(.ql-fullscreen)").prop("disabled", true);
				this.$toolbar.find("select").prop("disabled", true);
			}

			const $fs_btn = this.$toolbar.find(".ql-fullscreen");
			if ($fs_btn.length) {
				$fs_btn.find("use").attr("href", "#icon-collapse");
			}
		}
		
		this.$fullscreen_modal.find(".btn-close").click(() => this.exit_fullscreen());
		this.$fullscreen_modal.click((e) => {
			if ($(e.target).hasClass("text-editor-fullscreen-modal")) {
				this.exit_fullscreen();
			}
		});
		
		$(document).on("keydown.fullscreen-editor", (e) => {
			if (e.key === "Escape") this.exit_fullscreen();
		});
	}

	exit_fullscreen() {
		this.is_fullscreen = false;

		if (this.$toolbar?.length) {
			this.$toolbar.find("button, select").prop("disabled", false);
			this.original_parent.append(this.$toolbar);
		}
		this.original_parent.append(this.quill_container);

		this.quill_container.find(".ql-editor").css({
			"height": this.original_height || "300px",
			"max-height": this.df.max_height || ""
		});

		const $fs_btn = this.$wrapper.find(".ql-fullscreen");
		if ($fs_btn.length) {
			$fs_btn.find("use").attr("href", "#icon-expand");
		}

		this.destroy_fullscreen_modal();
		$(document).off("keydown.fullscreen-editor");

		this.$toolbar = null;
		this.original_parent = null;
		this.original_height = null;
	}
};
