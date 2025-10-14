import path from 'path';
import { fileURLToPath } from 'url';
import { loadManifest } from './contract.js';
import fs from 'fs';
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
	const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
	const manifest = loadManifest(config.paths.pluginsDir); // load kernel's own manifest

	// Create plugin loader once and get the repl and cli plugins
	const defaultPluginsDir = path.join(__dirname, 'default-plugins');
	const pluginLoader = new PluginLoader(defaultPluginsDir);
	const replStart = await pluginLoader.getPluginMethod('repl', 'start');
	const cliRun = await pluginLoader.getPluginMethod('cli', 'run');

	if (!replStart || !cliRun) {
		console.error('❌ repl or cli plugin not found or invalid');
		process.exit(1);
	}

	// Default to REPL mode if no args or if args are application-specific
	if (args.length === 0) {
		// Default to REPL mode if no args
		return replStart(__dirname, projectRoot, manifest.stateDefaults.contextFilePath, manifest.stateDefaults.replHistoryFilePath, manifest.stateDefaults.maxHistory);
	} else {
		// Check if we're being called directly with command line args
		return cliRun(__dirname, projectRoot, manifest.stateDefaults.contextFilePath, args);
	}
}

// Note: This file is not meant to be run directly. Use main.js in the project root.
