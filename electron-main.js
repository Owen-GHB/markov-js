import { buildConfig } from './kernel/utils/config-loader.js';
import { CommandProcessor } from './kernel/processor/CommandProcessor.js';
import { manifest } from './kernel/contract.js';

// Create and start the Electron application with unified config
// Using dynamic import to get electron plugin and manifest inside an async IIFE
(async () => {
  const electronPlugin = await import('./kernel/plugins/electron/index.js');
  
  // Build unified configuration using project root
  const projectRoot = process.cwd(); // Use current working directory as project root
  const config = buildConfig(projectRoot);
  const commandProcessor = new CommandProcessor(config, manifest);
  
  await electronPlugin.start(config, manifest, commandProcessor);
})();