const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

const sidebar = document.getElementById('sidebar');
const editor = document.getElementById('editor');

let currentFolder = null;
let currentFilePath = null;

// --- Modal Setup ---
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');
const modalInput = document.getElementById('modalInput');
const modalOk = document.getElementById('modalOk');
const modalCancel = document.getElementById('modalCancel');

function showModal(title, defaultValue) {
  modalTitle.textContent = title;
  modalInput.value = defaultValue || "";
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

function flashEditorSaved() {
    editor.classList.add('saving');
    setTimeout(() => {
      editor.classList.remove('saving');
    }, 250);
  }
  
function saveCurrentFile() {
if (!currentFilePath) return;
const content = editor.textContent;
fs.writeFile(currentFilePath, content, 'utf8', (err) => {
    if (err) console.error("Save failed:", err);
    else {
    console.log("File saved:", currentFilePath);
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
  localStorage.setItem('workspace', folderPath); // Remember workspace
  sidebar.innerHTML = ''; // Clear sidebar

  fs.readdir(folderPath, { withFileTypes: true }, (err, entries) => {
    if (err) return console.error(err);
    entries.forEach(entry => {
      const item = document.createElement('div');
      item.textContent = entry.name;
      if (entry.isDirectory()) {
        item.style.fontWeight = 'bold';
      }
      item.addEventListener('click', () => {
        if (!entry.isDirectory()) {
          saveCurrentFile();
          openFile(path.join(folderPath, entry.name));
        }
      });
      sidebar.appendChild(item);
    });
  });
}

function openFile(filePath) {
  currentFilePath = filePath;
  localStorage.setItem('lastFile', filePath); // Remember last file
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) return console.error(err);
    editor.textContent = data;
  });
}

// --- Button Listeners ---
document.getElementById('openFolder').addEventListener('click', async () => {
  const folderPath = await ipcRenderer.invoke('dialog:openFolder');
  if (!folderPath) return;
  loadFolder(folderPath);
});

document.getElementById('newFile').addEventListener('click', async () => {
  if (!currentFolder) {
    const folderPath = await ipcRenderer.invoke('dialog:openFolder');
    if (!folderPath) return;
    loadFolder(folderPath);
  }
  const fileName = await showModal("Enter new file name", "untitled.md");
  if (!fileName) return;
  currentFilePath = path.join(currentFolder, fileName);
  fs.writeFile(currentFilePath, "", err => {
    if (err) return console.error(err);
    // Add new file to sidebar
    const item = document.createElement('div');
    item.textContent = fileName;
    item.addEventListener('click', () => {
      saveCurrentFile();
      openFile(path.join(currentFolder, fileName));
    });
    sidebar.appendChild(item);
  });
});

document.getElementById('newFolder').addEventListener('click', async () => {
  if (!currentFolder) {
    const folderPath = await ipcRenderer.invoke('dialog:openFolder');
    if (!folderPath) return;
    loadFolder(folderPath);
  }
  const folderName = await showModal("Enter new folder name", "New Folder");
  if (!folderName) return;
  const newFolderPath = path.join(currentFolder, folderName);
  fs.mkdir(newFolderPath, { recursive: true }, err => {
    if (err) return console.error(err);
    // Add new folder to sidebar
    const item = document.createElement('div');
    item.textContent = folderName;
    item.style.fontWeight = 'bold';
    item.addEventListener('click', () => loadFolder(newFolderPath));
    sidebar.appendChild(item);
  });
});

document.getElementById('exportPDF').addEventListener('click', () => {
  console.log('PDF export not implemented yet');
});

// --- Reload Last Workspace & File on Startup ---
window.addEventListener('DOMContentLoaded', () => {
  const savedWorkspace = localStorage.getItem('workspace');
  const savedFile = localStorage.getItem('lastFile');
  if (savedWorkspace) {
    loadFolder(savedWorkspace);
    if (savedFile) {
      // Wait a short time for the folder to load
      setTimeout(() => openFile(savedFile), 200);
    }
  }
});
