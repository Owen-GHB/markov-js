import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pathResolver from './path-resolver.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load configuration from file with fallback to defaults
 * @param {string} configFilePath - Path to configuration file
 * @param {Object} defaultConfig - Default configuration values
 * @returns {Object} Loaded configuration merged with defaults
 */
function loadConfigFromFile(configFilePath, defaultConfig = {}) {
	let config = { ...defaultConfig };
	try {
		if (fs.existsSync(configFilePath)) {
			const configFile = fs.readFileSync(configFilePath, 'utf8');
			const loadedConfig = JSON.parse(configFile);
			config = { ...config, ...loadedConfig };
		}
	} catch (error) {
		console.warn(
			'⚠️ Could not load config file, using defaults:',
			error.message,
		);
	}
	return config;
}

/**
 * Build a complete configuration object with both file config and kernel-calculated paths
 * @param {string} projectRoot - The project root directory
 * @returns {Object} Complete configuration with resolved paths
 */
export function buildConfig(projectRoot) {
	const configFilePath = path.join(projectRoot, 'kernel', 'config.json');

	// Load kernel configuration from file
	const kernelConfig = loadConfigFromFile(configFilePath, {
		http: { port: 8080 },
		repl: { maxHistory: 100 },
		paths: {
			kernelDir: 'kernel',
			contractDir: 'contract',
			configDir: 'config',
			contextDir: 'context',
		},
		plugins: {},
	});

	// Load configuration for each enabled plugin and merge their paths
	const allPluginPaths = {};
	if (kernelConfig.plugins) {
		for (const [pluginName, pluginConfig] of Object.entries(
			kernelConfig.plugins,
		)) {
			if (pluginConfig.enabled) {
				// Load plugin-specific config
				const pluginConfigPath = path.join(
					projectRoot,
					'kernel',
					'plugins',
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

	// Build complete paths using path resolver and kernel config
	const resolvedPaths = {
		// Core paths that must be calculated by kernel
		configFilePath: configFilePath,
		contextFilePath: pathResolver.getContextFilePath('state.json'),
		replHistoryFilePath: pathResolver.getContextFilePath('repl-history.json'),
		contractDir: pathResolver.getContractDir(),
		servedUIDir: pathResolver.getServedUIDir(),
		electronPreloadPath: pathResolver.getElectronPreloadPath(),

		// Use kernel config paths with kernel fallbacks
		kernelDir: pathResolver.getKernelDir(),
		generatedUIDir: pathResolver.getGeneratedUIDir(),
		contextDir: pathResolver.getContextDir(),
		templatesDir: pathResolver.getTemplatesDir(),
		uiFilePath: pathResolver.getUIFilePath(),
	};

	// Combine all paths in the right order for overrides:
	// 1. Plugin paths (defaults)
	// 2. Kernel config paths (overrides plugin defaults)
	// 3. Resolved paths (kernel-calculated, can be overridden by kernel config)
	const combinedPaths = {
		...allPluginPaths, // Plugin defaults first
		...kernelConfig.paths, // Kernel config overrides take precedence
		...resolvedPaths, // Resolved paths come after kernel config but can be overridden
	};

	// Build and return complete config object
	return {
		...kernelConfig,
		paths: combinedPaths,
	};
}
