// Author: Raisul Islam (raisul.aust1@gmail.com)
// Date May 2026
// Description: Adds fullscreen capability to Text Editor fields in Frappe/ERPNext.

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

	bind_events() {
		super.bind_events();
		this.patch_quill_image_tools();
	}

	patch_quill_image_tools() {
		const image_resize = this.quill?.getModule("imageResize");
		if (!image_resize || image_resize._tefs_image_tools_patched) return;

		image_resize._tefs_image_tools_patched = true;

		const original_show_overlay = image_resize.showOverlay.bind(image_resize);
		image_resize.showOverlay = () => {
			original_show_overlay();
			this.add_image_delete_button(image_resize);
			this.add_image_crop_button(image_resize);
		};

		const original_check_image = image_resize.checkImage.bind(image_resize);
		image_resize.checkImage = (evt) => {
			if (!image_resize.img) return;

			if (this.is_image_delete_key(evt)) {
				evt.preventDefault();
				evt.stopPropagation();
				this.delete_selected_quill_image(image_resize);
				return;
			}

			original_check_image(evt);
		};

		this._tefs_image_keydown = (evt) => {
			if (!image_resize.img || !this.is_image_delete_key(evt)) return;
			if (!this.quill?.root?.contains(image_resize.img)) return;

			evt.preventDefault();
			evt.stopPropagation();
			this.delete_selected_quill_image(image_resize);
		};
		document.addEventListener("keydown", this._tefs_image_keydown, true);
	}

	is_image_delete_key(evt) {
		return (
			evt.key === "Delete" ||
			evt.key === "Backspace" ||
			evt.keyCode === 46 ||
			evt.keyCode === 8
		);
	}

	delete_selected_quill_image(image_resize) {
		const img = image_resize?.img;
		if (!img || !this.quill) return;

		const Quill = this.quill.constructor;
		const blot = Quill.find(img);
		if (!blot) return;

		const index = this.quill.getIndex(blot);
		this.quill.deleteText(index, 1, "user");
		image_resize.hide();
	}

	add_image_delete_button(image_resize) {
		const overlay = image_resize?.overlay;
		if (!overlay || overlay.querySelector(".tefs-image-delete")) return;

		const $btn = $(`
			<button type="button" class="tefs-image-delete" title="${__("Delete")}">
				<svg class="icon icon-sm">
					<use href="#icon-delete"></use>
				</svg>
			</button>
		`);

		$btn.on("mousedown", (e) => e.preventDefault());
		$btn.on("click", (e) => {
			e.preventDefault();
			e.stopPropagation();
			this.delete_selected_quill_image(image_resize);
		});

		overlay.appendChild($btn[0]);
	}

	can_edit_quill_images() {
		return !this.df.read_only && this.quill?.isEnabled();
	}

	add_image_crop_button(image_resize) {
		if (!this.can_edit_quill_images()) return;

		const overlay = image_resize?.overlay;
		if (!overlay || overlay.querySelector(".tefs-image-crop")) return;

		const $btn = $(`
			<button type="button" class="tefs-image-crop" title="${__("Crop")}">
				<svg class="icon icon-sm">
					<use href="#icon-crop"></use>
				</svg>
			</button>
		`);

		$btn.on("mousedown", (e) => e.preventDefault());
		$btn.on("click", (e) => {
			e.preventDefault();
			e.stopPropagation();
			this.open_image_crop_dialog(image_resize);
		});

		overlay.appendChild($btn[0]);
	}

	open_image_crop_dialog(image_resize) {
		const img = image_resize?.img;
		if (!img?.src || !this.can_edit_quill_images()) return;

		this._tefs_crop_context = { image_resize, img };

		frappe.require(
			[
				"/assets/text_editor_fullscreen/vendor/cropper.min.js",
				"/assets/text_editor_fullscreen/vendor/cropper.min.css",
			],
			() => {
				if (typeof Cropper === "undefined") {
					frappe.msgprint(
						__("Could not load image cropper. Please refresh the page and try again.")
					);
					return;
				}
				this.show_image_crop_dialog();
			}
		);
	}

	is_in_grid_form() {
		return Boolean(this.$wrapper?.closest(".grid-row-open, .form-in-grid").length);
	}

	cleanup_crop_modal_backdrop($backdrop) {
		($backdrop || $(".modal-backdrop.tefs-crop-modal-backdrop")).remove();
	}

	restore_body_modal_state() {
		this.cleanup_crop_modal_backdrop();

		if (!$(".modal.show").length) {
			$(".modal-backdrop.show").not("#freeze").remove();
			$("body").removeClass("modal-open");
			if (!frappe.dom.freeze_count) {
				$("body").css({ overflow: "", "padding-right": "" });
			}
		}
	}

	repair_grid_form_freeze() {
		if (!frappe.dom.freeze_count || $("#freeze").length) return;
		frappe.dom.freeze_count = 0;
		frappe.dom.freeze("", "dark grid-form");
	}

	ensure_crop_dialog_z_index(dialog, $backdrop) {
		if (!this.is_fullscreen) return;

		const z_index = 1070;
		dialog.$wrapper.css("z-index", z_index);
		$backdrop?.addClass("tefs-crop-backdrop").css("z-index", z_index - 10);
	}

	show_image_crop_dialog() {
		const { image_resize, img } = this._tefs_crop_context || {};
		if (!img?.src) return;

		let cropper_instance = null;
		let crop_applied = false;
		let crop_backdrop = null;

		const dialog = new frappe.ui.Dialog({
			title: __("Crop Image"),
			size: "large",
			keep_grid_form_open: this.is_in_grid_form(),
			animate: false,
		});
		dialog.$wrapper.addClass("tefs-crop-dialog");
		if (this.is_fullscreen) {
			dialog.$wrapper.addClass("tefs-crop-dialog--over-fullscreen");
		}

		const $content = $(`
			<div class="tefs-cropper-dialog">
				<div class="tefs-cropper-aspect-ratios btn-group margin-bottom">
					<button type="button" class="btn btn-default btn-sm active" data-ratio="free">${__(
						"Free",
						null,
						"Image Cropper"
					)}</button>
					<button type="button" class="btn btn-default btn-sm" data-ratio="1">${__(
						"1:1",
						null,
						"Image Cropper"
					)}</button>
					<button type="button" class="btn btn-default btn-sm" data-ratio="1.333">${__(
						"4:3",
						null,
						"Image Cropper"
					)}</button>
					<button type="button" class="btn btn-default btn-sm" data-ratio="1.778">${__(
						"16:9",
						null,
						"Image Cropper"
					)}</button>
				</div>
				<div class="tefs-cropper-wrapper">
					<img class="tefs-cropper-image" alt="" />
				</div>
			</div>
		`);

		dialog.$body.append($content);

		const $crop_img = $content.find(".tefs-cropper-image");

		const init_cropper = () => {
			if (cropper_instance || !dialog.$wrapper.is(":visible")) return;
			cropper_instance = new Cropper($crop_img[0], {
				zoomable: false,
				scalable: false,
				viewMode: 1,
				aspectRatio: NaN,
				checkCrossOrigin: false,
			});
		};

		$crop_img.on("error", () => {
			frappe.msgprint(
				__(
					"Unable to load image for cropping. The image may be from an external source that does not allow editing."
				)
			);
			dialog.hide();
		});

		$content.find("[data-ratio]").on("click", function () {
			$content.find("[data-ratio]").removeClass("active");
			$(this).addClass("active");
			const ratio = $(this).data("ratio");
			cropper_instance?.setAspectRatio(ratio === "free" ? NaN : parseFloat(ratio));
		});

		dialog.set_primary_action(__("Crop"), () => {
			this.apply_image_crop(cropper_instance, dialog, img, () => {
				crop_applied = true;
			});
		});

		dialog.set_secondary_action_label(__("Cancel"));

		const setup_crop_dialog = () => {
			crop_backdrop = $(".modal-backdrop.show").not("#freeze").last();
			crop_backdrop.addClass("tefs-crop-modal-backdrop");
			this.ensure_crop_dialog_z_index(dialog, crop_backdrop);
			$crop_img.attr("src", img.src);
			if ($crop_img[0].complete) {
				init_cropper();
			} else {
				$crop_img.one("load", init_cropper);
			}
		};

		dialog.on_page_show = setup_crop_dialog;

		const cleanup_crop_dialog = () => {
			cropper_instance?.destroy();
			cropper_instance = null;

			if (!crop_applied && image_resize?.quill?.root?.contains(img)) {
				image_resize.show(img);
			}

			dialog.$wrapper.remove();
			this.cleanup_crop_modal_backdrop(crop_backdrop);
			this.restore_body_modal_state();
			this.repair_grid_form_freeze();
			this._tefs_crop_context = null;
		};

		dialog.$wrapper.on("hidden.bs.modal.tefs-crop", () => {
			dialog.$wrapper.off("hidden.bs.modal.tefs-crop");
			cleanup_crop_dialog();
		});

		image_resize.hide();
		dialog.$wrapper.appendTo("body");
		dialog.show();
	}

	apply_image_crop(cropper_instance, dialog, original_img, on_success) {
		if (!cropper_instance) return;

		const canvas = cropper_instance.getCroppedCanvas();
		if (!canvas) {
			frappe.msgprint(__("Could not crop image."));
			return;
		}

		const $primary_btn = dialog.get_primary_btn();
		$primary_btn.prop("disabled", true);

		canvas.toBlob((blob) => {
			if (!blob) {
				frappe.msgprint(__("Could not crop image."));
				$primary_btn.prop("disabled", false);
				return;
			}

			const file_name = this.get_cropped_file_name(original_img.src);
			this.upload_cropped_image(blob, file_name)
				.then((file_doc) => {
					this.replace_quill_image(original_img, file_doc.file_url);
					on_success?.();
					cropper_instance.destroy();
					dialog.hide();
				})
				.catch(() => {
					frappe.msgprint(__("Failed to upload cropped image."));
					$primary_btn.prop("disabled", false);
				});
		}, "image/png");
	}

	get_cropped_file_name(src) {
		const base = src.split("/").pop()?.split("?")[0] || "image";
		const name = base.replace(/\.[^.]+$/, "");
		return `${name}-cropped.png`;
	}

	replace_quill_image(img, file_url) {
		img.src = file_url;
		img.removeAttribute("width");
		img.removeAttribute("height");
		if (img.style) {
			img.style.width = "";
			img.style.height = "";
		}

		this.parse_validate_and_set_in_model(this.get_input_value());
	}

	upload_cropped_image(blob, file_name) {
		return new Promise((resolve, reject) => {
			const xhr = new XMLHttpRequest();
			xhr.open("POST", "/api/method/upload_file", true);
			xhr.setRequestHeader("Accept", "application/json");
			xhr.setRequestHeader("X-Frappe-CSRF-Token", frappe.csrf_token);

			const form_data = new FormData();
			form_data.append("file", blob, file_name);
			form_data.append("is_private", 0);
			form_data.append("folder", "Home/Attachments");

			if (this.frm?.doctype && this.frm?.docname && !this.frm.is_new()) {
				form_data.append("doctype", this.frm.doctype);
				form_data.append("docname", this.frm.docname);
			}

			xhr.onreadystatechange = () => {
				if (xhr.readyState !== XMLHttpRequest.DONE) return;
				if (xhr.status === 200) {
					try {
						resolve(JSON.parse(xhr.responseText).message);
					} catch (e) {
						reject(e);
					}
				} else {
					reject(new Error(xhr.responseText || "Upload failed"));
				}
			};
			xhr.send(form_data);
		});
	}

	make() {
		super.make();
		this.ensure_form_tab_listener();
		this.schedule_fullscreen_button_setup();
	}

	refresh_input() {
		super.refresh_input();
		this.schedule_fullscreen_button_setup();
	}

	is_child_table_field() {
		// Circuit breaker: if it's physically inside a modal, explicitly return false
		if (this.$wrapper?.closest('.modal, .form-in-grid').length) return false;

		// Frappe's explicit flag (strict check to avoid truthy surprises)
		if (this.in_grid === true) return true;

		// DOM-based check: is this control physically inside an inline grid row?
		if (this.$wrapper?.closest('.grid-body, .grid-row-open').length) return true;

		return false;
	}

	set_disp_area(value) {
		super.set_disp_area(value);
		this.schedule_fullscreen_button_setup();
	}

	set_formatted_input(value) {
		super.set_formatted_input(value);
		this.schedule_fullscreen_button_setup();
	}

	schedule_fullscreen_button_setup() {
		clearTimeout(this._tefs_btn_timer);
		this._tefs_btn_timer = setTimeout(() => this.refresh_fullscreen_ui(), 100);
	}

	ensure_form_tab_listener() {
		if (!this.frm || this.frm._tefs_tab_listener_bound) return;
		this.frm._tefs_tab_listener_bound = true;

		this.frm.$wrapper.on("shown.bs.tab.tefs", '[data-toggle="tab"]', () => {
			setTimeout(() => this.refresh_visible_tab_text_editors(), 50);
		});
	}

	refresh_visible_tab_text_editors() {
		if (!this.frm?.$wrapper) return;

		this.frm.$wrapper
			.find('.tab-pane.active .frappe-control[data-fieldtype="Text Editor"]')
			.each((_, el) => {
				el.fieldobj?.schedule_fullscreen_button_setup?.();
			});
	}

	uses_disp_area() {
		if (this.is_child_table_field()) return;
		
		const $disp_area = this.$wrapper.find(".control-value.like-disabled-input");
		return $disp_area.length > 0 
            && !$disp_area.hasClass("hide") 
            && $disp_area.css("display") !== "none";
	}

	refresh_fullscreen_ui() {
		if (this.is_child_table_field()) return;

		if (this.is_fullscreen) return;

		if (this.uses_disp_area()) {
			this.remove_editable_fullscreen_button();
			this.$wrapper.find(".ql-container .ql-fullscreen-readonly").remove();
			this.add_fullscreen_button_to_disp_area();
			return;
		}

		if (this.quill) {
			this.add_fullscreen_button();
		}
	}

	add_fullscreen_button_to_disp_area() {
		if (this.is_child_table_field()) return;

		const $disp_area = this.$wrapper.find(".control-value.like-disabled-input");
		if (!$disp_area.length) return;

		$disp_area.find(".ql-fullscreen-readonly").remove();
		$disp_area.off(".tefs");

		// const value = this.value || $disp_area.text() || "";
		// if (!String(value).trim()) return;

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

		$disp_area.on("mousemove.tefs", () => {
			if (mouseMoveTimeout) clearTimeout(mouseMoveTimeout);
			showButton();
			mouseMoveTimeout = setTimeout(hideButton, 2000);
		});

		$disp_area.on("mouseenter.tefs", showButton);
		$disp_area.on("mouseleave.tefs", () => {
			if (mouseMoveTimeout) clearTimeout(mouseMoveTimeout);
			hideButton();
		});

		$fullscreen_btn.on("mouseenter.tefs", () => {
			if (mouseMoveTimeout) clearTimeout(mouseMoveTimeout);
			showButton();
		});
	}

	remove_editable_fullscreen_button() {
		const $toolbar = this.$wrapper.find(".ql-toolbar");
		$toolbar.find(".ql-formats-fullscreen").remove();
		$toolbar.children(".ql-fullscreen").remove();
		$toolbar.removeClass("tefs-has-fullscreen").css({
			position: "",
			"padding-right": "",
		});
	}

	add_editable_fullscreen_button() {
		if (this.is_child_table_field()) return;
		const $toolbar = this.$wrapper.find(".ql-toolbar");
		if (!$toolbar.length) return;

		this.remove_editable_fullscreen_button();

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

		const $formats = $('<span class="ql-formats ql-formats-fullscreen"></span>');
		$formats.append($fullscreen_btn);
		$toolbar.addClass("tefs-has-fullscreen").append($formats);
	}

	add_fullscreen_button() {
		if (this.is_child_table_field()) return;

		if (this.uses_disp_area()) {
			this.add_fullscreen_button_to_disp_area();
			return;
		}

		this.$wrapper.find(".ql-fullscreen-readonly").remove();
		this.remove_editable_fullscreen_button();

		if (!this.quill) {
			const observer = new MutationObserver(() => {
				if (this.$wrapper.find(".ql-container").length) {
					observer.disconnect();
					this.add_fullscreen_button();
				}
			});
			observer.observe(this.$wrapper[0], { childList: true, subtree: true });
			return;
		}

		const is_read_only = this.df.read_only || !this.quill.isEnabled();

		if (is_read_only) {
			const $container = this.$wrapper.find(".ql-container");
			if (!$container.length) return;

			$container.off(".tefs"); 

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

			$container.on("mousemove.tefs", () => {
				if (mouseMoveTimeout) clearTimeout(mouseMoveTimeout);
				showButton();
				mouseMoveTimeout = setTimeout(hideButton, 2000);
			});

			$container.on("mouseenter.tefs", showButton);
			$container.on("mouseleave.tefs", () => {
				if (mouseMoveTimeout) clearTimeout(mouseMoveTimeout);
				hideButton();
			});

			$fullscreen_btn.on("mouseenter.tefs", () => {
				if (mouseMoveTimeout) clearTimeout(mouseMoveTimeout);
				showButton();
			});

		} else {
			this.add_editable_fullscreen_button();
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
		if (this.df.parent && this.frm?.fields_dict[this.df.parent]?.grid) {
			return;
		}

		if (!this.value) return;

		this.$fullscreen_modal = $(`
			<div class="modal fade show text-editor-fullscreen-modal text-editor-fullscreen-modal--readonly" style="display: block;">
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
		if (this.df.parent && this.frm?.fields_dict[this.df.parent]?.grid) {
			return;
		}
		this.is_fullscreen = true;
		// Restore lock preference from previous session
		this._is_fullscreen_locked = localStorage.getItem("tefs_fullscreen_locked") === "1";

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
							<button type="button" class="btn-lock-toggle" title="${__('Lock (prevent accidental close)')}" style="background: transparent; border: none;">
								<svg class="icon icon-sm">
									<use href="#icon-unlock"></use>
								</svg>
							</button>
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

			this.$toolbar.find(".ql-fullscreen").hide();
		}

		// ── Close button: always exits regardless of lock state ──────────────
		this.$fullscreen_modal.find(".btn-close").on("click.tefs", () => this.exit_fullscreen());

		// ── Lock / unlock toggle ─────────────────────────────────────────────
		const $lock_btn = this.$fullscreen_modal.find(".btn-lock-toggle");

		// Apply the restored lock state to the UI immediately
		if (this._is_fullscreen_locked) {
			$lock_btn.find("use").attr("href", "#icon-lock");
			$lock_btn.attr("title", __("Unlock (allow close on outside click / Escape)"));
			this.$fullscreen_modal.addClass("tefs-locked");
		}

		$lock_btn.on("click.tefs", () => {
			this._is_fullscreen_locked = !this._is_fullscreen_locked;

			if (this._is_fullscreen_locked) {
				$lock_btn.find("use").attr("href", "#icon-lock");
				$lock_btn.attr("title", __("Unlock (allow close on outside click / Escape)"));
				this.$fullscreen_modal.addClass("tefs-locked");
				localStorage.setItem("tefs_fullscreen_locked", "1");
			} else {
				$lock_btn.find("use").attr("href", "#icon-unlock");
				$lock_btn.attr("title", __("Lock (prevent accidental close)"));
				this.$fullscreen_modal.removeClass("tefs-locked");
				localStorage.setItem("tefs_fullscreen_locked", "0");
			}
		});

		// ── Click outside the modal-dialog ───────────────────────────────────
		// Exits when unlocked; nudges when locked.
		this.$fullscreen_modal.on("click.tefs", (e) => {
			if (!$(e.target).hasClass("text-editor-fullscreen-modal")) return;

			if (this._is_fullscreen_locked) {
				this.nudge_locked_modal();
			} else {
				this.exit_fullscreen();
			}
		});

		// ── Escape key ───────────────────────────────────────────────────────
		// Exits when unlocked; nudges when locked.
		$(document).on("keydown.fullscreen-editor", (e) => {
			if (e.key !== "Escape") return;

			if (this._is_fullscreen_locked) {
				this.nudge_locked_modal();
			} else {
				this.exit_fullscreen();
			}
		});
	}

	// Brief shake on the modal-dialog to signal exit is blocked while locked.
	nudge_locked_modal() {
		if (!this.$fullscreen_modal) return;
		const $dialog = this.$fullscreen_modal.find(".modal-dialog");
		const $lock_btn = this.$fullscreen_modal.find(".btn-lock-toggle");
		const $close_btn = this.$fullscreen_modal.find(".btn-close");

		// Force-restart animations if already running
		$dialog.removeClass("tefs-locked-nudge");
		$lock_btn.removeClass("tefs-locked-highlight");
		$close_btn.removeClass("tefs-locked-point");

		// trigger reflow so browser resets animation
		void $dialog[0].offsetWidth; 
		void $lock_btn[0].offsetWidth;
		void $close_btn[0].offsetWidth;

		// Add classes to trigger animations
		$dialog.addClass("tefs-locked-nudge");
		$lock_btn.addClass("tefs-locked-highlight");
		$close_btn.addClass("tefs-locked-point");

		clearTimeout(this._nudge_timer);
		this._nudge_timer = setTimeout(() => {
			$dialog.removeClass("tefs-locked-nudge");
			$lock_btn.removeClass("tefs-locked-highlight");
			$close_btn.removeClass("tefs-locked-point");
		}, 400);
	}

	exit_fullscreen() {
		this.is_fullscreen = false;
		this._is_fullscreen_locked = false;

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
			$fs_btn.show();
		}

		this.destroy_fullscreen_modal();
		$(document).off("keydown.fullscreen-editor");

		this.$toolbar = null;
		this.original_parent = null;
		this.original_height = null;

		this.schedule_fullscreen_button_setup();
	}
};