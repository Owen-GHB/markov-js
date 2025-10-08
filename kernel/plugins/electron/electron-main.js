import { buildConfig } from '../../utils/config-loader.js';
import { CommandProcessor } from '../../processor/CommandProcessor.js';
import { manifest } from '../../contract.js';
import { ElectronApp } from './ElectronApp.js';

// Create and start the Electron application by directly using ElectronApp
(async () => {
  // Build unified configuration using project root
  const projectRoot = process.cwd(); // Use current working directory as project root
  const config = buildConfig(projectRoot);
  const commandProcessor = new CommandProcessor(config, manifest);
  
  // Directly instantiate and start ElectronApp (bypassing plugin system)
  const electronApp = new ElectronApp();
  
  await electronApp.start(config, commandProcessor);
})();