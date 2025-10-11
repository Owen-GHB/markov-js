import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PathResolver from './path-resolver.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load configuration from file
 * @param {string} configFilePath - Path to configuration file
 * @returns {Object} Loaded configuration
 */
function loadConfigFromFile(configFilePath) {
	if (!fs.existsSync(configFilePath)) {
		throw new Error(`Configuration file does not exist: ${configFilePath}`);
	}

	const configFile = fs.readFileSync(configFilePath, 'utf8');
	return JSON.parse(configFile);
}

/**
 * Build a complete configuration object with both file config and kernel-calculated paths
 * @param {string} configFilePath - Path to the config file to read
 * @param {string} projectRoot - The project root directory
 * @returns {Object} Complete configuration with resolved paths
 */
export function buildConfig(configFilePath, projectRoot) {
	// Load raw kernel configuration from file (without path processing)
	const rawKernelConfig = loadConfigFromFile(configFilePath);

	// Load configuration for each enabled plugin and merge their paths
	const allPluginPaths = {};
	if (rawKernelConfig.plugins) {
		for (const [pluginName, pluginConfig] of Object.entries(
			rawKernelConfig.plugins,
		)) {
			if (pluginConfig.enabled) {
				// Load plugin-specific config using the pluginsDir from kernel config
				if (!rawKernelConfig.paths?.pluginsDir) {
					throw new Error(
						'pluginsDir must be defined in the kernel configuration',
					);
				}
				const pluginsDir = rawKernelConfig.paths.pluginsDir;
				const pluginConfigPath = path.join(
					projectRoot,
					pluginsDir,
					pluginName,
					'config.json',
				);
				if (fs.existsSync(pluginConfigPath)) {
					try {
						const pluginFileConfig = JSON.parse(
							fs.readFileSync(pluginConfigPath, 'utf8'),
						);
						// If the plugin has specific paths, merge them
						if (pluginFileConfig.paths) {
							Object.assign(allPluginPaths, pluginFileConfig.paths);
						}
					} catch (error) {
						console.warn(
							`⚠️ Could not load config for plugin ${pluginName}:`,
							error.message,
						);
					}
				}
			}
		}
	}

	// Calculate kernel directory relative to this file's location
	// This file is at kernel/utils/config-loader.js, so kernel dir is one level up
	const calculatedKernelDir = path.join(__dirname, '..'); // Go up one level from utils/ to get kernel/

	// Create path resolver with the raw config (combining kernel and plugin paths)
	const combinedRawPaths = {
		...allPluginPaths,
		...rawKernelConfig.paths,
		kernelDir: calculatedKernelDir, // Override with calculated kernel dir
	};

	const pathResolver = new PathResolver(projectRoot, {
		paths: combinedRawPaths,
	});

	// Build complete paths using the path resolver
	const resolvedPaths = {
		configFilePath: configFilePath,
		contextFilePath: pathResolver.getContextFilePath(),
		replHistoryFilePath: pathResolver.getReplHistoryFilePath(),
		contractDir: pathResolver.getContractDir(),
		servedUIDir: pathResolver.getServedUIDir(),
		electronPreloadPath: pathResolver.getElectronPreloadPath(),
		kernelDir: calculatedKernelDir,
		generatedUIDir: pathResolver.getGeneratedUIDir(),
		templatesDir: pathResolver.getTemplatesDir(),
		uiFilePath: pathResolver.getUIFilePath(),
	};

	// Combine all paths in the right order for overrides:
	// 1. Plugin paths (defaults)
	// 2. Kernel config paths (overrides plugin defaults)
	// 3. Resolved paths (kernel-calculated, can be overridden by kernel config)
	const combinedPaths = {
		...allPluginPaths, // Plugin defaults first
		...rawKernelConfig.paths, // Kernel config overrides take precedence
		...resolvedPaths, // Resolved paths come after kernel config but can be overridden
	};

	// Build and return complete config object
	return {
		...rawKernelConfig,
		paths: combinedPaths,
	};
}
