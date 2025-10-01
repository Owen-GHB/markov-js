const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  executeCommand: (command) => ipcRenderer.invoke('execute-command', command),
  getManifests: () => ipcRenderer.invoke('get-manifests')
});