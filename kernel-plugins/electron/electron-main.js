// File: electron/electron-main.js

import { ElectronApp } from './ElectronApp.js';
import { KernelLoader } from '../shared/KernelLoader.js';

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
const kernelPath = argMap['kernel-path'];
const servedui = argMap['servedui'];
const electronPreloadPath = argMap['electron-preload-path'];

if (!projectRoot || !kernelPath) {
    console.error(
        '❌ Missing required arguments: --project-root and --kernel-path',
    );
    process.exit(1);
}

// Create and start the Electron application by dynamically loading kernel modules
(async () => {
    try {
        // Create kernel loader with the provided paths
        const kernelLoader = new KernelLoader(kernelPath, projectRoot);

        // Build configuration dynamically
        const config = await kernelLoader.buildConfig();

        // Override config with command line parameters if provided
        if (servedui) {
            config.electron.paths.servedUIDir = servedui;
        }
        if (electronPreloadPath) {
            config.electron.paths.electronPreloadPath = electronPreloadPath;
        }

        // Get manifest dynamically
        const manifest = await kernelLoader.getManifest(projectRoot);

        // Create CommandProcessor dynamically
        const commandProcessor = await kernelLoader.createCommandProcessor(
            projectRoot,
            manifest,
        );

        // Directly instantiate and start ElectronApp with the dynamically created components
        const electronApp = new ElectronApp();

        await electronApp.start(config.electron, commandProcessor);
    } catch (error) {
        console.error('❌ Error in Electron main process:', error.message);
        process.exit(1);
    }
})();