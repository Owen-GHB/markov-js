import { buildConfig } from './kernel/utils/config-loader.js';
import { CommandProcessor } from './kernel/processor/CommandProcessor.js';
import { manifest } from './kernel/contract.js';
import { pluginLoader } from './kernel/utils/PluginLoader.js';

// Create and start the Electron application with unified config
// Using the plugin loader to get the electron plugin
(async () => {
  // Build unified configuration using project root
  const projectRoot = process.cwd(); // Use current working directory as project root
  const config = buildConfig(projectRoot);
  const commandProcessor = new CommandProcessor(config, manifest);
  
  // Get the electron plugin using the plugin loader
  const electronStart = await pluginLoader.getPluginMethod('electron', 'start');
  
  if (!electronStart) {
    console.error('❌ electron plugin not found or invalid');
    process.exit(1);
  }
  
  await electronStart(config, commandProcessor);
})();