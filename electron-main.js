import { app, BrowserWindow, ipcMain } from 'electron';
import { ElectronUIManager } from './kernel/electron/ui-manager.js';
import { ElectronCommandHandler } from './kernel/electron/command-handler.js';
import pathResolver from './kernel/utils/path-resolver.js';

const createWindow = () => {
  const uiManager = new ElectronUIManager();
  const commandHandler = new ElectronCommandHandler();

  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: pathResolver.getElectronPreloadPath(),
    }
  });

  // Load the generated UI
  const uiPath = uiManager.getUIPath();
  
  // Check if UI exists, if not generate it first
  if (!uiManager.hasUI()) {
    console.log('Generated UI not found, generating...');
    uiManager.generateUIIfNeeded().then(() => {
      mainWindow.loadFile(uiPath);
    }).catch(err => {
      console.error('Failed to generate UI:', err);
      // Load a simple error page
      mainWindow.loadURL(`data:text/html,<h1>UI Generation Failed</h1><p>${err.message}</p>`);
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
  const handler = new ElectronCommandHandler();
  return await handler.executeCommand(command);
});

// IPC handler to get manifests
ipcMain.handle('get-manifests', () => {
  const handler = new ElectronCommandHandler();
  return handler.getManifests();
});