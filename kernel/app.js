import { manifest } from './contract.js';
import { buildConfig } from './utils/config-loader.js';
import { CommandProcessor } from './processor/CommandProcessor.js';
import { pluginLoader } from './utils/PluginLoader.js';

/**
 * Launch the hosted application (Markov text generator) with the given arguments and project root
 * @param {string[]} args - Command line arguments
 * @param {string} projectRoot - The project root directory
 * @returns {Promise<void>}
 */
export async function launch(args, projectRoot) {
  // Build unified configuration once at the beginning
  const config = buildConfig(projectRoot);
  const commandProcessor = new CommandProcessor(config, manifest);
  
  // Get the stdio plugin using the plugin loader
  const stdioStart = await pluginLoader.getPluginMethod('stdio', 'start');
  const stdioRun = await pluginLoader.getPluginMethod('stdio', 'run');
  
  if (!stdioStart || !stdioRun) {
    console.error('❌ stdio plugin not found or invalid');
    process.exit(1);
  }
  
  // Default to REPL mode if no args or if args are application-specific
  if (args.length === 0) {
    // Default to REPL mode if no args
    return stdioStart(config, manifest, commandProcessor);
  } else {
    // Check if we're being called directly with command line args
    return stdioRun(config, manifest, commandProcessor, args);
  }
}

// Note: This file is not meant to be run directly. Use main.js in the project root.