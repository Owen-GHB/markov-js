import path from 'path';
import { fileURLToPath } from 'url';
import { manifestReader } from './contract.js';
import { buildConfig } from './utils/config-loader.js';
import { CommandProcessor } from './processor/CommandProcessor.js';
import { PluginLoader } from './utils/PluginLoader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Launch the hosted application with the given arguments and project root
 * @param {string[]} args - Command line arguments
 * @param {string} projectRoot - The project root directory
 * @returns {Promise<void>}
 */
export async function launch(args, projectRoot) {
	// Build unified configuration once at the beginning
	// Calculate config path relative to this file's location (app.js is in kernel/ dir)
	const configFilePath = path.join(__dirname, 'config.json');
	const config = buildConfig(configFilePath, projectRoot);
	const manifest = manifestReader(projectRoot);
	const commandProcessor = new CommandProcessor(projectRoot, manifest);

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
		return replStart(config.repl.paths.contextFilePath,config.repl.paths.replHistoryFilePath,config.repl.maxHistory, config.paths.kernelPath, projectRoot);
	} else {
		// Check if we're being called directly with command line args
		return cliRun(config.cli.paths.contextFilePath, config.paths.kernelPath, projectRoot, args);
	}
}

// Note: This file is not meant to be run directly. Use main.js in the project root.
