const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

const sidebar = document.getElementById('sidebar');
const editor = document.getElementById('editor');
const previewPanel = document.getElementById('previewPanel');

let currentFolder = null;
let currentFilePath = null;
let folderWatcher = null; // Global watcher for current folder
let previewActive = false;

// --- Modal Setup ---
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');
const modalInput = document.getElementById('modalInput');
const modalOk = document.getElementById('modalOk');
const modalCancel = document.getElementById('modalCancel');

function showModal(title, defaultValue) {
  modalTitle.textContent = title;
  modalInput.value = defaultValue || '';
  modal.classList.remove('hidden');
  return new Promise((resolve) => {
    modalOk.onclick = () => {
      modal.classList.add('hidden');
      resolve(modalInput.value.trim());
    };
    modalCancel.onclick = () => {
      modal.classList.add('hidden');
      resolve(null);
    };
  });
}

// --- Save Functionality ---
function flashEditorSaved() {
  editor.classList.add('saving');
  setTimeout(() => {
    editor.classList.remove('saving');
  }, 250);
}

function saveCurrentFile() {
  if (!currentFilePath) return;
  const content = editor.innerText; // Use innerText to preserve line breaks
  fs.writeFile(currentFilePath, content, 'utf8', (err) => {
    if (err) console.error('Save failed:', err);
    else {
      console.log('File saved:', currentFilePath);
      flashEditorSaved();
    }
  });
}

// Auto-save every 8 seconds
setInterval(saveCurrentFile, 8000);

// Save on Ctrl+S (or Command+S)
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    saveCurrentFile();
  }
});

// Save on window close
window.addEventListener('beforeunload', saveCurrentFile);

// --- Folder & File Handling ---
function loadFolder(folderPath) {
  currentFolder = folderPath;
  localStorage.setItem('workspace', folderPath);
  sidebar.innerHTML = ''; // Clear sidebar

  if (folderWatcher) folderWatcher.close();

  fs.readdir(folderPath, { withFileTypes: true }, (err, entries) => {
    if (err) return console.error(err);
    entries.forEach((entry) => {
      if (entry.isDirectory()) {
        addSidebarItem(entry.name, true);
      } else {
        const ext = path.extname(entry.name).toLowerCase();
        // Allow text files or media files (images, pdf)
        if (
          ext === '.md' ||
          ext === '.txt' ||
          ext === '.pdf' ||
          ['.png', '.jpg', '.jpeg', '.gif', '.bmp'].includes(ext)
        ) {
          addSidebarItem(entry.name, false);
        }
      }
    });
  });

  folderWatcher = fs.watch(folderPath, (event, filename) => {
    if (!filename) return;
    const filePath = path.join(folderPath, filename);
    const existingItem = Array.from(sidebar.children).find(
      (item) => item.textContent === filename
    );
    if (!fs.existsSync(filePath)) {
      if (existingItem) {
        sidebar.removeChild(existingItem);
        console.log(`Removed ${filename} from sidebar because it was deleted.`);
      }
    } else {
      if (!existingItem) {
        const isDir = fs.lstatSync(filePath).isDirectory();
        addSidebarItem(filename, isDir);
        console.log(`Added ${filename} to sidebar.`);
      }
    }
  });
}

function addSidebarItem(name, isDirectory) {
  const item = document.createElement('div');
  item.textContent = name;
  item.classList.add('sidebar-item');

  if (isDirectory) {
    item.style.fontWeight = 'bold';
  } else {
    // Determine file type based on extension
    const ext = path.extname(name).toLowerCase();
    let fileType = '';
    if (ext === '.md' || ext === '.txt') {
      fileType = 'text';
    } else if (
      ext === '.pdf' ||
      ['.png', '.jpg', '.jpeg', '.gif', '.bmp'].includes(ext)
    ) {
      fileType = 'media';
    }
    item.dataset.fileType = fileType;

    item.addEventListener('click', () => {
      // Clear any previous active state
      const activeItem = sidebar.querySelector('.sidebar-item.active');
      if (activeItem) activeItem.classList.remove('active');
      item.classList.add('active');

      const fullPath = path.join(currentFolder, name);
      if (fileType === 'text') {
        // Save current text file and then open the new one
        saveCurrentFile();
        openTextFile(fullPath);
      } else if (fileType === 'media') {
        openMediaFile(fullPath);
      }
    });
  }
  sidebar.appendChild(item);
}

function openTextFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext !== '.md' && ext !== '.txt') {
    alert(
      'Only Markdown (.md) and text (.txt) files are supported for editing.'
    );
    return;
  }
  currentFilePath = filePath;
  localStorage.setItem('lastFile', filePath);
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) return console.error(err);
    editor.innerText = data;
    if (previewActive) updatePreview();
    highlightActiveSidebarItem(filePath);
  });
}

function openMediaFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  // Ensure preview mode is active
  if (!previewActive) {
    togglePreview(); // Switches to split view (editor left, preview right)
  }
  if (ext === '.pdf') {
    previewPanel.innerHTML = `<iframe src="file://${filePath}" style="width:100%; height:100%;" frameborder="0"></iframe>`;
  } else if (['.png', '.jpg', '.jpeg', '.gif', '.bmp'].includes(ext)) {
    previewPanel.innerHTML = `<img src="file://${filePath}" style="max-width:100%; max-height:100%;" />`;
  } else {
    previewPanel.innerHTML = 'Unsupported media file.';
  }
  // Set focus back to the editor so it remains editable
  editor.focus();
}

function highlightActiveSidebarItem(filePath) {
  const fileName = path.basename(filePath);
  // Remove active state from all items
  document
    .querySelectorAll('#sidebar .sidebar-item.active')
    .forEach((item) => item.classList.remove('active'));

  // Find the matching sidebar item and add active class
  const matchingItem = Array.from(sidebar.children).find(
    (item) => item.textContent === fileName
  );
  if (matchingItem) {
    matchingItem.classList.add('active');
  }
}

function openFile(filePath) {
  currentFilePath = filePath;
  localStorage.setItem('lastFile', filePath);
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) return console.error(err);
    editor.innerText = data;
    if (previewActive) updatePreview();
    highlightActiveSidebarItem(filePath);
  });
}

// --- Button Listeners ---
document.getElementById('openFolder').addEventListener('click', async () => {
  const folderPath = await ipcRenderer.invoke('dialog:openFolder');
  if (!folderPath) return;
  loadFolder(folderPath);
});

document.getElementById('newFile').addEventListener('click', async () => {
  saveCurrentFile();
  if (!currentFolder) {
    const folderPath = await ipcRenderer.invoke('dialog:openFolder');
    if (!folderPath) return;
    loadFolder(folderPath);
  }
  let fileName = await showModal('Enter new file name', 'untitled.md');
  if (!fileName) return;
  let baseName = fileName;
  let extension = '';
  const dotIndex = fileName.lastIndexOf('.');
  if (dotIndex !== -1) {
    baseName = fileName.slice(0, dotIndex);
    extension = fileName.slice(dotIndex);
  }
  let counter = 0;
  let newFilePath = path.join(currentFolder, fileName);
  while (fs.existsSync(newFilePath)) {
    counter++;
    newFilePath = path.join(currentFolder, `${baseName}${counter}${extension}`);
  }
  fs.writeFile(newFilePath, '', (err) => {
    if (err) return console.error(err);
    // Let the folder watcher add the new file to the sidebar.
    currentFilePath = newFilePath;
    editor.textContent = '';
    openFile(newFilePath);
  });
});

document.getElementById('exportPDF').addEventListener('click', async () => {
  if (!currentFilePath) {
    alert('No file is currently open to export.');
    return;
  }
  const folder = path.dirname(currentFilePath);
  const markdownContent = editor.innerText;
  const rawHtml = marked.parse(markdownContent);

  const htmlWithEmbeddedImages = rawHtml.replace(
    /<img\s+src="([^"]+)"/g,
    (match, srcPath) => {
      if (srcPath.startsWith('http') || srcPath.startsWith('data:')) {
        return match;
      }
      try {
        const absPath = path.join(folder, srcPath);
        const imageData = fs.readFileSync(absPath);
        let ext = path.extname(absPath).toLowerCase().replace('.', '');
        if (ext === 'jpg') ext = 'jpeg';
        if (ext === 'svg') ext = 'svg+xml';
        return `<img src="data:image/${ext};base64,${imageData.toString(
          'base64'
        )}"`;
      } catch (err) {
        console.error('Failed to embed image:', srcPath, err);
        return match;
      }
    }
  );

  const fullHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Export PDF</title>
        <style>
          body { font-family: sans-serif; margin: 40px; color: black; background: white; }
          img { max-width: 100%; }
          a { color: blue; text-decoration: underline; }
        </style>
      </head>
      <body>
        ${htmlWithEmbeddedImages}
      </body>
    </html>
  `;

  const result = await ipcRenderer.invoke('export-rendered-pdf', {
    html: fullHtml,
    markdownPath: currentFilePath,
  });
  if (result.success) {
    alert('PDF exported successfully.');
  } else {
    alert('PDF export failed: ' + (result.error || 'Unknown error'));
  }
});

// --- Preview Split View ---
document.getElementById('preview').addEventListener('click', togglePreview);

function togglePreview() {
  previewActive = !previewActive;
  if (previewActive) {
    // Enable split view: adjust editor and show preview panel
    editor.classList.add('split');
    previewPanel.classList.remove('hidden');
    updatePreview();
  } else {
    // Disable preview: hide preview panel and let editor use full width
    previewPanel.classList.add('hidden');
    editor.classList.remove('split');
  }
}

function updatePreview() {
  if (previewActive) {
    let html = marked.parse(editor.innerText);
    if (currentFilePath) {
      const folder = path.dirname(currentFilePath);
      // Replace relative src paths with absolute file:// URLs
      html = html.replace(/<img\s+src="([^"]+)"/g, (match, srcPath) => {
        if (
          !srcPath.startsWith('file://') &&
          !srcPath.startsWith('http') &&
          !srcPath.startsWith('data:')
        ) {
          const absolutePath = path.join(folder, srcPath);
          return `<img src="file://${absolutePath.replace(/\\/g, '/')}"`;
        }
        return match;
      });
    }
    previewPanel.innerHTML = html;
  }
}

editor.addEventListener('input', () => {
  if (previewActive) updatePreview();
});

editor.addEventListener('click', () => {
  if (currentFilePath) {
    highlightActiveSidebarItem(currentFilePath);
  }
});

const fgColorInput = document.getElementById('fgColor');

fgColorInput.addEventListener('input', (e) => {
  const color = e.target.value;
  document.documentElement.style.setProperty('--editor-fg-color', color);
  localStorage.setItem('fgColor', color);
});

// --- Reload Last Workspace & File on Startup ---
window.addEventListener('DOMContentLoaded', () => {
  const savedWorkspace = localStorage.getItem('workspace');
  const savedFile = localStorage.getItem('lastFile');
  if (savedWorkspace) {
    loadFolder(savedWorkspace);
    if (savedFile) {
      setTimeout(() => openFile(savedFile), 200);
    }
  }
  const savedColor = localStorage.getItem('fgColor');
  if (savedColor) {
    fgColorInput.value = savedColor;
    document.documentElement.style.setProperty('--editor-fg-color', savedColor);
  }
});

// --- Image Paste & Drag-Drop Handling ---
function insertAtCursor(text) {
  const sel = window.getSelection();
  if (sel.rangeCount) {
    const range = sel.getRangeAt(0);
    range.deleteContents();
    const textNode = document.createTextNode(text);
    range.insertNode(textNode);
    range.setStartAfter(textNode);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  }
}

editor.addEventListener('paste', (e) => {
  const items = e.clipboardData.items;
  let handledImage = false;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.type.indexOf('image') !== -1) {
      e.preventDefault();
      handledImage = true;
      const blob = item.getAsFile();
      const ext = '.png';
      const imageName = `image_${Date.now()}${ext}`;
      const folder = path.dirname(currentFilePath);
      const destPath = path.join(folder, imageName);
      const reader = new FileReader();
      reader.onload = function () {
        const base64Data = reader.result.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');
        fs.writeFile(destPath, buffer, (err) => {
          if (err) console.error('Saving pasted image failed:', err);
          else {
            insertAtCursor(`\n\n![Image](${imageName})\n`);
          }
        });
      };
      reader.readAsDataURL(blob);
      break;
    }
  }
  if (handledImage) e.preventDefault();
});

editor.addEventListener('dragover', (e) => {
  e.preventDefault();
});

editor.addEventListener('drop', (e) => {
  e.preventDefault();
  if (!currentFilePath) return;
  const folder = path.dirname(currentFilePath);
  Array.from(e.dataTransfer.files).forEach((file) => {
    if (file.type.startsWith('image/')) {
      const srcPath = file.path;
      // Use file.name if file.path is missing; default to .png if no extension found.
      const ext = path.extname(srcPath || file.name) || '.png';
      const imageName = `image_${Date.now()}${ext}`;
      const destPath = path.join(folder, imageName);

      if (srcPath) {
        fs.copyFile(srcPath, destPath, (err) => {
          if (err) {
            console.error('Image copy failed:', err);
          } else {
            insertAtCursor(`\n\n![Image](${imageName})\n`);
          }
        });
      } else {
        // Fallback: use FileReader to load the file and write it manually.
        const reader = new FileReader();
        reader.onload = function () {
          const buffer = Buffer.from(reader.result);
          fs.writeFile(destPath, buffer, (err) => {
            if (err) console.error('Image save failed:', err);
            else {
              insertAtCursor(`\n\n![Image](${imageName})\n`);
            }
          });
        };
        reader.readAsArrayBuffer(file);
      }
    }
  });
});
