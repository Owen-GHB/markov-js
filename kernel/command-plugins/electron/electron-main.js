// File: electron/electron-main.js

import { ElectronApp } from './ElectronApp.js';
import { Vertex } from 'vertex-kernel';

// Parse command line arguments to get project root, kernel path, and electron parameters
const args = process.argv.slice(2);
const argMap = {};
for (let i = 0; i < args.length; i += 2) {
    if (args[i].startsWith('--')) {
        const key = args[i].substring(2);
        const value = args[i + 1];
        argMap[key] = value;
    }
}

const projectRoot = argMap['project-root'];
const commandRoot = argMap['command-root'];
const servedui = argMap['servedui'];
const electronPreloadPath = argMap['electron-preload-path'];

// Create and start the Electron application using Vertex executor
(async () => {
    try {
        // Create executor using Vertex
        const vertex = new Vertex(commandRoot, projectRoot);

        // Directly instantiate and start ElectronApp with the executor
        const electronApp = new ElectronApp();
        await electronApp.start(servedui, electronPreloadPath, vertex);
    } catch (error) {
        console.error('❌ Error in Electron main process:', error.message);
        process.exit(1);
    }
})();