import { buildConfig } from './utils/config-loader.js';
import { manifestReader } from './contract.js';
import { CommandProcessor } from './processor/CommandProcessor.js';
import { PluginLoader } from './utils/PluginLoader.js';
import path from 'path';

/**
 * Launch the kernel infrastructure with the given arguments and project root
 * @param {string[]} args - Command line arguments
 * @param {string} projectRoot - The project root directory
 * @returns {Promise<void>}
 */
export async function launch(args, projectRoot) {
	// Build unified configuration once at the beginning
	const config = buildConfig(projectRoot);
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

		return electronPlugin.start(config, commandProcessor);
	}
	// Check if we should regenerate UI
	else if (args.includes('--generate')) {
		// Get the generator plugin and run it using the plugin loader
		const generatorPlugin = await pluginLoader.getPlugin('generator');
		if (!generatorPlugin) {
			console.error('❌ Generator plugin not found or invalid');
			process.exit(1);
		}

		return generatorPlugin
			.run(config, manifest, commandProcessor)
			.then(() => {
				console.log('✅ UI generation completed successfully!');
				process.exit(0);
			})
			.catch((err) => {
				console.error('❌ Failed to generate UI:', err.message);
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

		return httpPlugin.start(config, commandProcessor);
	} else {
		// For other kernel commands or to show help
		console.log('Kernel command-line interface');
		console.log('Available commands:');
		console.log('  --generate             Generate UI from contracts');
		console.log(
			'  --http[=port]          Serve UI and API on specified port (default 8080)',
		);
		console.log('  --electron             Launch Electron application');
		process.exit(0);
	}
}

// Note: This file is not meant to be run directly. Use kernel.js in the project root.
