# WR1TE

WR1TE is a minimal Electron-based Markdown editor and workspace app for creating, editing, and previewing Markdown (`.md`) and text (`.txt`) files. It also supports viewing media files like images and PDFs in a split preview mode.

## Download

Download the latest release of WR1TE from the [Releases](https://github.com/GrafKnusprig/WR1TE/releases) page.

For Windows users, download the installer (NSIS) and run it to install the app on your machine.

## Features

- **Markdown & Text Editing:** Open, edit, and save `.md` and `.txt` files.
- **Media Preview:** View images and PDFs without saving them.
- **Split View Preview:** Toggle a live preview of your Markdown content.
- **Auto-Save:** Files are automatically saved every 8 seconds and on demand (Ctrl/Command+S).
- **Customizable Colors:** Choose your preferred editor text color with the built-in color picker.
- **Sidebar Navigation:** Easily browse your workspace with a highlighted sidebar for the active file.
- **Drag & Drop Images:** Quickly insert images into your Markdown by dragging and dropping them.

## How to Use

1. **Open Folder:** Click the "Open Folder" button in the menu to select your workspace.
2. **New File:** Create a new Markdown file by clicking "New File".
3. **Editing:** Edit your file in the editor pane. Your changes are auto-saved.
4. **Preview:** Toggle the preview pane to see a live render of your Markdown.
5. **Export PDF:** Export your Markdown file as a PDF using the "Export PDF" button.
6. **Customize Color:** Use the color picker in the menu to change the editor's text color. Your selection will be saved for future sessions.

## Installation

If you downloaded the installer, simply run it and follow the on-screen instructions.

## Build for Developers

If you'd like to build WR1TE from source:

### Clone the Repository:

   ```bash
   git clone https://github.com/GrafKnusprig/WR1TE.git
   cd WR1TE
   ```

### Install Dependencies:

Make sure you have Node.js installed, then run:

```
npm install
```

### Run in Development Mode:

```
npm start
```