import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load configuration from file
 */
function loadConfigFromFile(configFilePath) {
	if (!fs.existsSync(configFilePath)) {
		throw new Error(`Configuration file does not exist: ${configFilePath}`);
	}
	return JSON.parse(fs.readFileSync(configFilePath, 'utf8'));
}

/**
 * Build a complete configuration object with fully resolved paths
 */
export function buildConfig(configFilePath, projectRoot) {
	// Load raw kernel configuration
	const rawKernelConfig = loadConfigFromFile(configFilePath);

	// Calculate kernel directory (fixed relative to this file)
	const kernelDir = path.join(__dirname, '..');

	// Load plugin paths by scanning the plugins directory
	const pluginPaths = {};
	if (rawKernelConfig.paths?.pluginsDir) {
		const pluginsDir = path.resolve(projectRoot, rawKernelConfig.paths.pluginsDir);
		
		// Scan the plugins directory for all plugin folders
		if (fs.existsSync(pluginsDir)) {
			try {
				const pluginDirs = fs.readdirSync(pluginsDir).filter(item => {
					const itemPath = path.join(pluginsDir, item);
					return fs.statSync(itemPath).isDirectory();
				});

				// Load config for each discovered plugin
				for (const pluginName of pluginDirs) {
					const pluginConfigPath = path.join(pluginsDir, pluginName, 'config.json');
					if (fs.existsSync(pluginConfigPath)) {
						try {
							const pluginFileConfig = JSON.parse(fs.readFileSync(pluginConfigPath, 'utf8'));
							Object.assign(pluginPaths, pluginFileConfig.paths || {});
						} catch (error) {
							console.warn(`⚠️ Could not load config for plugin ${pluginName}:`, error.message);
						}
					}
				}
			} catch (error) {
				console.warn(`⚠️ Could not scan plugins directory ${pluginsDir}:`, error.message);
			}
		}
	}

	// Merge all path sources
	const allRawPaths = {
		...pluginPaths,
		...(rawKernelConfig.paths || {}),
	};

	// Resolve EVERY path in the config against project root
	const resolvedPaths = {};
	for (const [key, value] of Object.entries(allRawPaths)) {
		resolvedPaths[key] = value ? path.resolve(projectRoot, value) : null;
	}

	// Add kernel-calculated paths (these override any config)
	resolvedPaths.projectRoot = projectRoot;
	resolvedPaths.kernelDir = kernelDir;
	resolvedPaths.configFilePath = configFilePath;

	// Add utility functions for dynamic paths
	resolvedPaths.getContractManifestPath = (commandName) => 
		resolvedPaths.contractDir ? path.join(resolvedPaths.contractDir, commandName, 'manifest.json') : null;
	
	resolvedPaths.getContractHandlerPath = (commandName) => 
		resolvedPaths.contractDir ? path.join(resolvedPaths.contractDir, commandName, 'handler.js') : null;
	
	resolvedPaths.getUIFilePath = (filename = 'index.html') => 
		resolvedPaths.generatedUIDir ? path.join(resolvedPaths.generatedUIDir, filename) : null;

	// Return complete config
	return {
		...rawKernelConfig,
		paths: resolvedPaths,
	};
}