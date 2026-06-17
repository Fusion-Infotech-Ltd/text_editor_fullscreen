## Text Editor Fullscreen v2.0.0

First stable release of **Text Editor Fullscreen** — a lightweight Frappe app that adds a fullscreen mode to all **Text Editor** (Quill) fields on the desk.

No configuration required. Install the app and every Text Editor field gets a fullscreen control automatically.

# Video Tutorial:

[![Watch the video](https://img.youtube.com/vi/JAzG84p_XPo/0.jpg)](https://youtu.be/JAzG84p_XPo?si=cS0uihv7n1sH2hnI)

---
### ERPNext Version 16.x.x

<img width="1538" height="916" alt="Recording 2026-05-28 162716" src="https://github.com/user-attachments/assets/c3bfdf26-d27b-45fc-8deb-ee66f3b94ec4" />

<img width="1372" height="898" alt="image" src="https://github.com/user-attachments/assets/b50cfa42-b3e9-4d2c-9ae7-dfb8ffeb6c6e" />
<img width="1365" height="908" alt="image" src="https://github.com/user-attachments/assets/fa284165-423b-457c-b8f2-feecf5a52cf7" />
<img width="202" height="85" alt="image" src="https://github.com/user-attachments/assets/ce93e261-17e5-4493-85a1-2bc09f6e1d16" />

<img width="1026" height="430" alt="v16 text editor 1" src="https://github.com/user-attachments/assets/4211b85f-6ab9-4500-836a-5030f5de74eb" />
<img width="1025" height="440" alt="v16 text editor 3" src="https://github.com/user-attachments/assets/3b47ed64-a522-4346-bea4-e1e03277c6a4" />
<img width="1872" height="960" alt="Screenshot from 2026-05-19 10-46-52" src="https://github.com/user-attachments/assets/8ea448e3-c4cf-4384-9ff2-39f0dcc3a0e4" />
<img width="448" height="430" alt="image" src="https://github.com/user-attachments/assets/68abbcbc-a5bc-406d-8d60-dcb3ec9f1261" />


ERPNext Version 15.x.x
<img width="1293" height="890" alt="v15 text editor 5" src="https://github.com/user-attachments/assets/4499beba-a214-41c7-a562-1ea9901d1ec6" />
<img width="1138" height="396" alt="v15 text editor 6" src="https://github.com/user-attachments/assets/7c5c6a25-bc8b-490c-8b22-47bedcfd0c60" />
<img width="448" height="430" alt="image" src="https://github.com/user-attachments/assets/358390f0-b009-4296-8b5d-9c036503c127" />




First stable release of **Text Editor Fullscreen** — a lightweight Frappe app that adds a fullscreen mode to all **Text Editor** (Quill) fields on the desk.

No configuration required. Install the app and every Text Editor field gets a fullscreen control automatically.

---

## Features

### Fullscreen editing
- Expand/collapse button on the Quill toolbar (editable fields)
- Moves the editor and toolbar into a focused modal for long-form writing
- **Escape** or click outside to exit (You can lock so that fullscreen does not close without pressing close button or minimize button introduced in v.2.0.0)
- The lock feature will prevent accidental minimize
- Lock state is saved in localstorage for the session
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
bench get-app https://github.com/raisulislam0/text_editor_fullscreen
bench install-app text_editor_fullscreen
bench build --app text_editor_fullscreen
