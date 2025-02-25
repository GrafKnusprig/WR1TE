const fs = require('fs');
const path = require('path');
const { remote } = require('electron');
const { dialog } = remote;

let folderPath = __dirname; // Default folder

const sidebar = document.getElementById('sidebar');
const editor = document.getElementById('editor');

// Function to load files from a folder (only .md files here)
function loadFiles() {
  sidebar.innerHTML = ''; // Clear sidebar
  fs.readdir(folderPath, (err, files) => {
    if (err) return console.error(err);
    files.forEach(file => {
      if (path.extname(file) === '.md') {
        const item = document.createElement('div');
        item.textContent = file;
        item.onclick = () => openFile(path.join(folderPath, file));
        sidebar.appendChild(item);
      }
    });
  });
}

// Function to open and display a file in the editor
function openFile(filePath) {
  fs.readFile(filePath, 'utf-8', (err, data) => {
    if (err) return console.error(err);
    editor.textContent = data;
  });
}

// Initially load files from the default folder
loadFiles();

// Hook up the Open Folder button
document.getElementById('openFolder').addEventListener('click', () => {
  dialog.showOpenDialog({
    properties: ['openDirectory']
  }).then(result => {
    if (!result.canceled && result.filePaths.length > 0) {
      folderPath = result.filePaths[0];
      loadFiles();
    }
  }).catch(err => console.error(err));
});

// Hook up the Export PDF button
document.getElementById('exportPDF').addEventListener('click', () => {
  const win = remote.getCurrentWindow();
  // Use default options; you can customize if needed.
  win.webContents.printToPDF({}).then(data => {
    const pdfPath = path.join(folderPath, 'export.pdf');
    fs.writeFile(pdfPath, data, (err) => {
      if (err) return console.error('Error exporting PDF:', err);
      alert('PDF exported to ' + pdfPath);
    });
  }).catch(error => {
    console.error('Error generating PDF:', error);
  });
});
