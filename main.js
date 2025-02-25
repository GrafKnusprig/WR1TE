const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    icon: path.join(__dirname, 'icon.ico'),
    frame: false,
    fullscreen: true,
    webPreferences: {
      nodeIntegration: true, // For simplicity (not recommended in production)
      contextIsolation: false,
    },
  });
  win.loadFile('index.html');
}

// Handle "open folder" request from renderer
ipcMain.handle('dialog:openFolder', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory'],
  });
  return canceled ? null : filePaths[0];
});

// Handle rendered markdown PDF export
ipcMain.handle('export-rendered-pdf', async (event, { html, markdownPath }) => {
  if (!markdownPath) {
    return { success: false, error: 'No markdown file provided' };
  }
  try {
    const pdfWin = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false,
      },
    });

    await pdfWin.loadURL(
      'data:text/html;charset=utf-8,' + encodeURIComponent(html)
    );
    await new Promise((resolve) => setTimeout(resolve, 500));

    const pdfData = await pdfWin.webContents.printToPDF({
      printBackground: true,
      landscape: false,
    });

    const folder = path.dirname(markdownPath);
    const baseName = path.basename(markdownPath, path.extname(markdownPath));
    const pdfFilePath = path.join(folder, `${baseName}.pdf`);
    fs.writeFileSync(pdfFilePath, pdfData);
    pdfWin.close();
    console.log('PDF exported to:', pdfFilePath);
    return { success: true };
  } catch (error) {
    console.error('PDF export failed', error);
    return { success: false, error };
  }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
