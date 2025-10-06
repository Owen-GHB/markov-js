import { ElectronApp } from './kernel/transports/electron/ElectronApp.js';
import { buildConfig } from './kernel/utils/config-loader.js';

// Create and start the Electron application with unified config
const electronApp = new ElectronApp();
// Using dynamic import to get manifest inside an async IIFE
(async () => {
  const { manifest } = await import('./kernel/contract.js');
  
  // Build unified configuration using project root
  const projectRoot = process.cwd(); // Use current working directory as project root
  const config = buildConfig(projectRoot);
  
  await electronApp.start(config, manifest);
})();