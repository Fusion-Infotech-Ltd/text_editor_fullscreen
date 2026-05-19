## Text Editor Fullscreen v1.0.0
<img width="1189" height="595" alt="image" src="https://github.com/user-attachments/assets/2b256346-2ea5-4173-8386-8c056580b8ff" />


First stable release of **Text Editor Fullscreen** — a lightweight Frappe app that adds a fullscreen mode to all **Text Editor** (Quill) fields on the desk.

No configuration required. Install the app and every Text Editor field gets a fullscreen control automatically.

---

## Features

### Fullscreen editing
- Expand/collapse button on the Quill toolbar (editable fields)
- Moves the editor and toolbar into a focused modal for long-form writing
- **Escape** or click outside to exit
- Toolbar icon switches between expand / collapse

### Read-only & display mode
- Fullscreen button on read-only editors and formatted display areas
- View long HTML content comfortably without editing

### ERPNext layout integration
- Modal width respects the desk **Toggle Full Width** setting
- **Full width off:** modal matches standard desk container width (not ~90% of the screen)
- **Full width on:** modal uses 90% width, aligned with Frappe’s full-width layout
- Resizes live if you toggle full width while the modal is open

### Desk UX
- Dark theme support
- Styled to match Frappe CSS variables (`--fg-color`, `--border-color`, etc.)
- Hover-reveal fullscreen button on read-only areas

---

## Installation

```bash
cd $PATH_TO_YOUR_BENCH
bench get-app https://github.com/raisulislam0/text_editor_fullscreen --branch main
bench install-app text_editor_fullscreen
bench build --app text_editor_fullscreen
