const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
try {
	contextBridge.exposeInMainWorld('electronAPI', {
		executeCommand: (command) => ipcRenderer.invoke('execute-command', command),
		getManifests: () => ipcRenderer.invoke('get-manifests'),
	});
} catch (error) {
	console.error('Failed to expose electronAPI via contextBridge:', error);
	// Fallback: expose directly to window (less secure, only for debugging)
	// This should not be done in production
	if (process.env.NODE_ENV !== 'production') {
		window.electronAPI = {
			executeCommand: (command) =>
				ipcRenderer.invoke('execute-command', command),
			getManifests: () => ipcRenderer.invoke('get-manifests'),
		};
	}
}
