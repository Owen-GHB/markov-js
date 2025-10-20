// File: electron/electron-main.js

import { ElectronApp } from './ElectronApp.js';
import { importVertex } from './imports.js';
import path from 'path';

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
const kernelPath = argMap['kernel-path'];
const servedui = argMap['servedui'];
const electronPreloadPath = argMap['electron-preload-path'];

if (!projectRoot || !kernelPath || !commandRoot) {
    console.error(
        '❌ Missing required arguments: --project-root, --command-root and --kernel-path',
    );
    process.exit(1);
}

// Create and start the Electron application using Vertex executor
(async () => {
    try {
        // Create executor using Vertex
        const Vertex = await importVertex(kernelPath);
        const kernel = new Vertex();
        const executor = new kernel.Executor(commandRoot, projectRoot);

        // Directly instantiate and start ElectronApp with the executor
        const electronApp = new ElectronApp();
        await electronApp.start(servedui, electronPreloadPath, executor);
    } catch (error) {
        console.error('❌ Error in Electron main process:', error.message);
        process.exit(1);
    }
})();