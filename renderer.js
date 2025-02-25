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

let folderWatcher = null; // Global watcher for current folder

function loadFolder(folderPath) {
  currentFolder = folderPath;
  localStorage.setItem('workspace', folderPath);
  sidebar.innerHTML = ''; // Clear sidebar

  // Close any existing watcher
  if (folderWatcher) folderWatcher.close();

  // Populate sidebar initially
  fs.readdir(folderPath, { withFileTypes: true }, (err, entries) => {
    if (err) return console.error(err);
    entries.forEach((entry) => {
      addSidebarItem(entry.name, entry.isDirectory());
    });
  });

  // Set up a watcher for the folder
  folderWatcher = fs.watch(folderPath, (event, filename) => {
    if (!filename) return;
    const filePath = path.join(folderPath, filename);

    // Check if item already exists in sidebar
    const existingItem = Array.from(sidebar.children).find(
      (item) => item.textContent === filename
    );

    if (!fs.existsSync(filePath)) {
      // File or folder was deleted; remove from sidebar if it exists.
      if (existingItem) {
        sidebar.removeChild(existingItem);
        console.log(`Removed ${filename} from sidebar because it was deleted.`);
      }
    } else {
      // File or folder exists (new or modified)
      if (!existingItem) {
        // New item detected; add it.
        const isDir = fs.lstatSync(filePath).isDirectory();
        addSidebarItem(filename, isDir);
        console.log(`Added ${filename} to sidebar.`);
      }
    }
  });
}

// Helper function to add an item to the sidebar
function addSidebarItem(name, isDirectory) {
  const item = document.createElement('div');
  item.textContent = name;
  if (isDirectory) {
    item.style.fontWeight = 'bold';
  }
  item.addEventListener('click', () => {
    const fullPath = path.join(currentFolder, name);
    if (isDirectory) {
      loadFolder(fullPath);
    } else {
      saveCurrentFile();
      openFile(fullPath);
    }
  });
  sidebar.appendChild(item);
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
  // Save the current file before creating a new one
  saveCurrentFile();

  if (!currentFolder) {
    const folderPath = await ipcRenderer.invoke('dialog:openFolder');
    if (!folderPath) return;
    loadFolder(folderPath);
  }

  // Ask for a new file name
  let fileName = await showModal('Enter new file name', 'untitled.md');
  if (!fileName) return;

  // Separate base and extension
  let baseName = fileName;
  let extension = '';
  const dotIndex = fileName.lastIndexOf('.');
  if (dotIndex !== -1) {
    baseName = fileName.slice(0, dotIndex);
    extension = fileName.slice(dotIndex);
  }

  // Check for duplicates and add a counter if needed, without brackets
  let counter = 0;
  let newFilePath = path.join(currentFolder, fileName);
  while (fs.existsSync(newFilePath)) {
    counter++;
    newFilePath = path.join(currentFolder, `${baseName}${counter}${extension}`);
  }

  // Create the new file with empty content
  fs.writeFile(newFilePath, '', (err) => {
    if (err) return console.error(err);

    // Add the new file to the sidebar
    const item = document.createElement('div');
    item.textContent = path.basename(newFilePath);
    item.addEventListener('click', () => {
      saveCurrentFile();
      openFile(newFilePath);
    });
    sidebar.appendChild(item);

    // Open the new file in the editor (empty it)
    currentFilePath = newFilePath;
    editor.textContent = '';
  });
});

document.getElementById('newFolder').addEventListener('click', async () => {
  if (!currentFolder) {
    const folderPath = await ipcRenderer.invoke('dialog:openFolder');
    if (!folderPath) return;
    loadFolder(folderPath);
  }
  const folderName = await showModal('Enter new folder name', 'New Folder');
  if (!folderName) return;
  const newFolderPath = path.join(currentFolder, folderName);
  fs.mkdir(newFolderPath, { recursive: true }, (err) => {
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
