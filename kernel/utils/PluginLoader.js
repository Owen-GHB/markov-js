import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

/**
 * PluginLoader - A dynamic plugin loader with caching capabilities
 * Similar to handler loading but for transport plugins like stdio, http, electron
 */
export class PluginLoader {
	constructor(pluginsBaseDir) {
		this.pluginCache = new Map(); // Cache plugins after loading
		this.pluginsBaseDir = pluginsBaseDir;
	}

	/**
	 * Get or load a plugin by name
	 * @param {string} pluginName - Name of the plugin to load (e.g., 'stdio', 'http', 'electron')
	 * @returns {Object|null} - The loaded plugin module or null if not found
	 */
	async getPlugin(pluginName) {
		// Check if plugin is already cached
		if (this.pluginCache.has(pluginName)) {
			return this.pluginCache.get(pluginName);
		}

		try {
			// Build the plugin file path
			const pluginPath = path.join(this.pluginsBaseDir, pluginName, 'index.js');
			// Check if the plugin file exists
			if (!fs.existsSync(pluginPath)) {
				console.warn(`Warning: Plugin not found at: ${pluginPath}`);
				return null;
			}

			// Convert to file URL for proper ES module loading
			const moduleUrl = pathToFileURL(pluginPath).href;
			// Dynamically import the plugin module
			const pluginModule = await import(moduleUrl);

			// Cache the plugin for future use
			this.pluginCache.set(pluginName, pluginModule);
			return pluginModule;
		} catch (error) {
			console.warn(
				`Warning: Could not load plugin ${pluginName}:`,
				error.message,
			);
			return null;
		}
	}

	/**
	 * Load and return a specific plugin method (start, run, etc.)
	 * @param {string} pluginName - Name of the plugin
	 * @param {string} methodName - Name of the method to extract (e.g., 'start', 'run')
	 * @returns {Function|null} - The requested method or null if not found
	 */
	async getPluginMethod(pluginName, methodName) {
		const plugin = await this.getPlugin(pluginName);

		if (!plugin) {
			return null;
		}

		const method = plugin[methodName];

		if (typeof method !== 'function') {
			console.warn(
				`Warning: Method '${methodName}' not found or is not a function in plugin '${pluginName}'`,
			);
			return null;
		}

		return method;
	}
}

// Export the class only - consumers need to create instances with the pluginsDir
export default PluginLoader;
