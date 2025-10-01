import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Create __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'electron-preload.js'),
    }
  });

  // Load the generated UI
  const uiPath = path.join(__dirname, 'generated-ui', 'index.html');
  
  // Check if UI exists, if not generate it first
  if (!fs.existsSync(uiPath)) {
    console.log('Generated UI not found, generating...');
    // Import and run the UI generator
    import('./kernel/generator/UI.js').then(({ UI }) => {
      const generator = new UI();
      generator.generate(
        path.join(__dirname, 'contract'),
        path.join(__dirname, 'generated-ui'),
        'index.html'
      ).then(() => {
        mainWindow.loadFile(uiPath);
      }).catch(err => {
        console.error('Failed to generate UI:', err);
        // Load a simple error page
        mainWindow.loadURL(`data:text/html,<h1>UI Generation Failed</h1><p>${err.message}</p>`);
      });
    });
  } else {
    // Load the generated UI
    mainWindow.loadFile(uiPath);
  }

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handler to execute commands via the kernel
ipcMain.handle('execute-command', async (event, command) => {
  try {
    const { CommandHandler } = await import('./kernel/CommandHandler.js');
    const handler = new CommandHandler();
    const result = await handler.handleCommand(command);
    return result;
  } catch (error) {
    return { error: error.message, output: null };
  }
});

// IPC handler to get manifests
ipcMain.handle('get-manifests', async () => {
  try {
    const { manifest } = await import('./kernel/contract.js');
    return manifest;
  } catch (error) {
    return { error: error.message };
  }
});