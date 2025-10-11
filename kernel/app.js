import { manifestReader } from './contract.js';
import { buildConfig } from './utils/config-loader.js';
import { CommandProcessor } from './processor/CommandProcessor.js';
import { PluginLoader } from './utils/PluginLoader.js';

/**
 * Launch the hosted application (Markov text generator) with the given arguments and project root
 * @param {string[]} args - Command line arguments
 * @param {string} projectRoot - The project root directory
 * @returns {Promise<void>}
 */
export async function launch(args, projectRoot) {
	// Build unified configuration once at the beginning
	const config = buildConfig(projectRoot);
	const manifest = manifestReader(config.paths.contractDir, projectRoot);
	const commandProcessor = new CommandProcessor(config, manifest);

	// Create plugin loader once and get the repl and cli plugins
	const pluginLoader = new PluginLoader(config.paths.pluginsDir);
	const replStart = await pluginLoader.getPluginMethod('repl', 'start');
	const cliRun = await pluginLoader.getPluginMethod('cli', 'run');

	if (!replStart || !cliRun) {
		console.error('❌ repl or cli plugin not found or invalid');
		process.exit(1);
	}

	// Default to REPL mode if no args or if args are application-specific
	if (args.length === 0) {
		// Default to REPL mode if no args
		return replStart(config, commandProcessor);
	} else {
		// Check if we're being called directly with command line args
		return cliRun(config, commandProcessor, args);
	}
}

// Note: This file is not meant to be run directly. Use main.js in the project root.
