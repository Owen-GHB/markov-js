import { buildConfig } from './utils/config-loader.js';
import { manifestReader } from './contract.js';
import { CommandProcessor } from './processor/CommandProcessor.js';
import { PluginLoader } from './utils/PluginLoader.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Launch the kernel infrastructure with the given arguments and project root
 * @param {string[]} args - Command line arguments
 * @param {string} projectRoot - The project root directory
 * @returns {Promise<void>}
 */
export async function launch(args, projectRoot) {
	// Build unified configuration once at the beginning
	// Calculate config path relative to this file's location (kernel.js is in kernel/ dir)
	const configFilePath = path.join(__dirname, 'config.json');
	const config = buildConfig(configFilePath, projectRoot);
	const manifest = manifestReader(config.paths.contractDir, projectRoot);
	const commandProcessor = new CommandProcessor(config, manifest);

	// Create plugin loader once for all plugin operations
	const pluginLoader = new PluginLoader(config.paths.pluginsDir);

	// Check if we should run in Electron
	if (args.includes('--electron')) {
		// Get the electron plugin and start it using the plugin loader
		const electronPlugin = await pluginLoader.getPlugin('electron');
		if (!electronPlugin) {
			console.error('❌ Electron plugin not found or invalid');
			process.exit(1);
		}

		return electronPlugin.start(
			config.paths.kernelDir
		);
	}
	// Check if we should regenerate UI with EJS templates
	else if (args.includes('--generate')) {
		// Get the generate plugin and run it using the plugin loader
		const generatePlugin = await pluginLoader.getPlugin('generate');
		if (!generatePlugin) {
			console.error('❌ Generate plugin not found or invalid');
			process.exit(1);
		}

		return generatePlugin
			.run(
				config.generate.paths.userTemplateDir,
				config.generate.paths.generatedUIDir,
				manifest,
				commandProcessor,
			)
			.then(() => {
				console.log('✅ EJS-based UI generation completed successfully!');
				process.exit(0);
			})
			.catch((err) => {
				console.error('❌ Failed to generate EJS-based UI:', err.message);
				process.exit(1);
			});
	}
	// Check if we should start HTTP server (now serves both UI and API, like old --serve)
	else if (args.includes('--http')) {
		// Get the HTTP plugin and start server that serves both UI and API
		const httpPlugin = await pluginLoader.getPlugin('http');
		if (!httpPlugin) {
			console.error('❌ HTTP plugin not found or invalid');
			process.exit(1);
		}

		return httpPlugin.start(
			config.http.port,
			config.http.paths.servedUIDir,
			config.http.apiEndpoint,
			commandProcessor,
		);
	} else {
		// For other kernel commands or to show help
		console.log('Kernel command-line interface');
		console.log('Available commands:');
		console.log(
			'  --generate             Generate UI from contracts using EJS templates',
		);
		console.log(
			'  --http                 Serve UI and API on specified port (default 8080)',
		);
		console.log('  --electron             Launch Electron application');
		process.exit(0);
	}
}

// Note: This file is not meant to be run directly. Use kernel.js in the project root.
