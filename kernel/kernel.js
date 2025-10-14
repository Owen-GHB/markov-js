import { PluginLoader } from './utils/PluginLoader.js';
import { loadManifest } from './contract.js';
import { resolveSecurePath } from './utils/path-resolver.js';
import fs from 'fs';
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
	const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
	// Create plugin loader once for all plugin operations
	const pluginLoader = new PluginLoader(config.paths.pluginsDir);
	const manifest = loadManifest(config.paths.pluginsDir); // load kernel's own manifest

	// Check if we should run in Electron
	if (args.includes('--electron')) {
		// resolve parameter paths relative to project root
		const servedUIDir = resolveSecurePath(manifest.stateDefaults.servedUIDir, projectRoot);
		const electronPreloadPath = resolveSecurePath(manifest.stateDefaults.electronPreloadPath, projectRoot);

		// Get the electron plugin and start it using the plugin loader
		const electronPlugin = await pluginLoader.getPlugin('electron');
		if (!electronPlugin) {
			console.error('❌ Electron plugin not found or invalid');
			process.exit(1);
		}

		return electronPlugin.start(
			__dirname,
			projectRoot,
			servedUIDir,
			electronPreloadPath
		);
	}
	// Check if we should regenerate UI with EJS templates
	else if (args.includes('--generate')) {
		// resolve parameter paths relative to project root
		const userTemplateDir = resolveSecurePath(manifest.stateDefaults.userTemplateDir, projectRoot);
		const generatedUIDir = resolveSecurePath(manifest.stateDefaults.generatedUIDir, projectRoot);

		// Get the generate plugin and run it using the plugin loader
		const generatePlugin = await pluginLoader.getPlugin('generate');
		if (!generatePlugin) {
			console.error('❌ Generate plugin not found or invalid');
			process.exit(1);
		}

		return generatePlugin
			.run(
				__dirname,
				projectRoot,
				userTemplateDir,
				generatedUIDir
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
		// resolve parameter paths relative to project root
		const port = manifest.stateDefaults.serverPort;
		const servedUIDir = resolveSecurePath(manifest.stateDefaults.servedUIDir, projectRoot);
		const apiEndpoint = manifest.stateDefaults.apiEndpoint;

		// Get the HTTP plugin and start server that serves both UI and API
		const httpPlugin = await pluginLoader.getPlugin('http');
		if (!httpPlugin) {
			console.error('❌ HTTP plugin not found or invalid');
			process.exit(1);
		}

		return httpPlugin.start(
			__dirname, 
			projectRoot,
			port,
			servedUIDir,
			apiEndpoint
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
