const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

const sidebar = document.getElementById('sidebar');
const editor = document.getElementById('editor');
let currentFolder = null;

// Modal helper
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
    // Cleanup existing listeners to avoid duplicates
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

// Helper to load folder content into sidebar
function loadFolder(folderPath) {
  currentFolder = folderPath;
  sidebar.innerHTML = ''; // clear existing content
  fs.readdir(folderPath, { withFileTypes: true }, (err, entries) => {
    if (err) return console.error(err);
    entries.forEach(entry => {
      const item = document.createElement('div');
      item.textContent = entry.name;
      if (entry.isDirectory()) {
        item.style.fontWeight = 'bold';
      }
      item.addEventListener('click', () => {
        // If it's a file, open it in the editor.
        if (!entry.isDirectory()) {
          openFile(path.join(folderPath, entry.name));
        }
        // For folders, you might load its content (optional)
        // item.addEventListener('click', () => loadFolder(path.join(folderPath, entry.name)));
      });
      sidebar.appendChild(item);
    });
  });
}

// Open file function
function openFile(filePath) {
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) return console.error(err);
    editor.textContent = data;
  });
}

// Open Folder button listener
document.getElementById('openFolder').addEventListener('click', async () => {
  const folderPath = await ipcRenderer.invoke('dialog:openFolder');
  if (!folderPath) return;
  loadFolder(folderPath);
});

// New File button listener
document.getElementById('newFile').addEventListener('click', async () => {
  // If no folder is open, ask for one.
  if (!currentFolder) {
    const folderPath = await ipcRenderer.invoke('dialog:openFolder');
    if (!folderPath) return;
    loadFolder(folderPath);
  }
  const fileName = await showModal("Enter new file name", "untitled.md");
  if (!fileName) return;
  const filePath = path.join(currentFolder, fileName);
  fs.writeFile(filePath, "", err => {
    if (err) return console.error(err);
    // Add the new file to sidebar
    const item = document.createElement('div');
    item.textContent = fileName;
    item.addEventListener('click', () => openFile(filePath));
    sidebar.appendChild(item);
  });
});

// New Folder button listener
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
    // Add the new folder to sidebar
    const item = document.createElement('div');
    item.textContent = folderName;
    item.style.fontWeight = 'bold';
    item.addEventListener('click', () => loadFolder(newFolderPath));
    sidebar.appendChild(item);
  });
});

// Export PDF button stub
document.getElementById('exportPDF').addEventListener('click', () => {
  console.log('PDF export not implemented yet');
});
