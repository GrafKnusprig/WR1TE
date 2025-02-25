const { ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

const sidebar = document.getElementById('sidebar');
const editor = document.getElementById('editor');

// "Open Folder" button listener
document.getElementById('openFolder').addEventListener('click', async () => {
  // Ask main process to open folder picker
  const folderPath = await ipcRenderer.invoke('dialog:openFolder');
  if (!folderPath) return; // User canceled

  // Clear existing sidebar content
  sidebar.innerHTML = '';

  // Read the folder contents
  fs.readdir(folderPath, { withFileTypes: true }, (err, entries) => {
    if (err) return console.error(err);

    // For now, just show top-level items in that folder
    entries.forEach(entry => {
      const item = document.createElement('div');
      item.textContent = entry.name;

      // If you want to differentiate folders
      if (entry.isDirectory()) {
        item.style.fontWeight = 'bold';
      }

      // Click to open file if it’s a file
      item.addEventListener('click', () => {
        if (!entry.isDirectory()) {
          const fileFullPath = path.join(folderPath, entry.name);
          fs.readFile(fileFullPath, 'utf8', (readErr, data) => {
            if (readErr) return console.error(readErr);
            editor.textContent = data;
          });
        }
      });

      sidebar.appendChild(item);
    });
  });
});

// "Export PDF" button listener (stub for now)
document.getElementById('exportPDF').addEventListener('click', () => {
  // You’ll implement PDF export later
  console.log('PDF export not implemented yet');
});
