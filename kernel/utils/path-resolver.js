import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

/**
 * Centralized path resolver for the entire kernel
 * Provides consistent path resolution across all kernel modules
 * Focuses on kernel-specific and project structure paths only
 */
class KernelPathResolver {
	constructor() {
		// Determine the project root dynamically
		// This file is at kernel/utils/path-resolver.js
		const currentFileDir = path.dirname(fileURLToPath(import.meta.url)); // kernel/utils/
		this.projectRoot = path.join(currentFileDir, '..'); // Go up 1 level to kernel/
		this.projectRoot = path.join(this.projectRoot, '..'); // Go up 1 more level to project root

		// Load configuration for path overrides
		this.config = this.loadConfig();
	}

	/**
	 * Load configuration for path overrides
	 * @returns {Object} Configuration object with path overrides
	 */
	loadConfig() {
		// Use the hardcoded default config path to avoid circular dependency
		const hardcodedConfigPath = path.join(
			this.projectRoot,
			'kernel',
			'config.json',
		);
		try {
			if (fs.existsSync(hardcodedConfigPath)) {
				const configFile = fs.readFileSync(hardcodedConfigPath, 'utf8');
				const loadedConfig = JSON.parse(configFile);
				return loadedConfig;
			}
		} catch (error) {
			console.warn(
				'⚠️ Could not load config file for path overrides, using defaults:',
				error.message,
			);
		}
		// Return empty config if loading fails
		return {};
	}

	/**
	 * Get the project root directory
	 * @returns {string} The project root path
	 */
	getProjectRoot() {
		return this.projectRoot;
	}

	/**
	 * Get the path to the kernel directory
	 * @returns {string} Path to kernel directory
	 */
	getKernelDir() {
		const configPath = this.config.paths?.kernelDir || 'kernel';
		return path.join(this.projectRoot, configPath);
	}

	/**
	 * Get the path to the contract directory
	 * @returns {string} Path to contract directory
	 */
	getContractDir() {
		const configPath = this.config.paths?.contractDir || 'contract';
		return path.join(this.projectRoot, configPath);
	}

	/**
	 * Get the path to the generated UI directory
	 * @returns {string} Path to generated UI directory
	 */
	getGeneratedUIDir() {
		const configPath = this.config.paths?.generatedUIDir || 'generated-ui';
		return path.join(this.projectRoot, configPath);
	}

	/**
	 * Get the path to the served UI directory (for HTTP serving/Electron)
	 * @returns {string} Path to served UI directory
	 */
	getServedUIDir() {
		// For now, use the same directory as generated UI
		// This can be customized later to point to a different location
		const configPath =
			this.config.paths?.servedUIDir ||
			this.config.paths?.generatedUIDir ||
			'generated-ui';
		return path.join(this.projectRoot, configPath);
	}

	/**
	 * Get the path to a specific UI file
	 * @param {string} filename - The UI filename (default: 'index.html')
	 * @returns {string} Path to the UI file
	 */
	getUIFilePath(filename = 'index.html') {
		return path.join(this.getGeneratedUIDir(), filename);
	}

	/**
	 * Get the path to the electron preload script
	 * @returns {string} Path to electron preload script
	 */
	getElectronPreloadPath() {
		const configPath =
			this.config.paths?.electronPreloadPath || 'electron-preload.js';
		// Always return absolute path for Electron preload
		return path.resolve(this.projectRoot, configPath);
	}

	/**
	 * Get the path to a specific contract manifest
	 * @returns {string} Path to the command's manifest
	 */
	getContractManifestPath(commandName) {
		return path.join(this.getContractDir(), commandName, 'manifest.json');
	}

	/**
	 * Get the path to a specific contract handler
	 * @returns {string} Path to the command's handler
	 */
	getContractHandlerPath(commandName) {
		return path.join(this.getContractDir(), commandName, 'handler.js');
	}

	/**
	 * Get the path to the config directory
	 * @returns {string} Path to config directory
	 */
	getConfigDir() {
		const configPath = this.config.paths?.configDir || 'config';
		return path.join(this.projectRoot, configPath);
	}

	/**
	 * Get the path to a specific config file
	 * @param {string} filename - The config filename (default: 'config.json' for kernel config)
	 * @returns {string} Path to the config file
	 */
	getConfigFilePath(filename = 'config.json') {
		// For kernel config, always use the kernel directory
		return path.join(this.projectRoot, 'kernel', filename);
	}

	/**
	 * Get the path to the context directory
	 * @returns {string} Path to context directory
	 */
	getContextDir() {
		const configPath = this.config.paths?.contextDir || 'context';
		return path.join(this.projectRoot, configPath);
	}

	/**
	 * Get the path to a specific context file
	 * @param {string} filename - The context filename
	 * @returns {string} Path to the context file
	 */
	getContextFilePath(filename) {
		return path.join(this.getContextDir(), filename);
	}

	/**
	 * Get the path to the templates directory
	 * @returns {string} Path to templates directory
	 */
	getTemplatesDir() {
		const configPath = this.config.paths?.templatesDir || 'templates';
		return path.join(this.projectRoot, configPath);
	}

	/**
	 * Get the path to a specific template file
	 * @param {string} filename - The template filename
	 * @returns {string} Path to the template file
	 */
	getTemplatePath(filename) {
		return path.join(this.getTemplatesDir(), filename);
	}

	/**
	 * Get an object containing all available paths
	 * @returns {Object} Object with all path values
	 */
	getAllPaths() {
		return {
			projectRoot: this.getProjectRoot(),
			kernelDir: this.getKernelDir(),
			contractDir: this.getContractDir(),
			generatedUIDir: this.getGeneratedUIDir(),
			servedUIDir: this.getServedUIDir(),
			electronPreloadPath: this.getElectronPreloadPath(),
			configDir: this.getConfigDir(),
			contextDir: this.getContextDir(),
			templatesDir: this.getTemplatesDir(),
			// Include some example paths with common filenames
			configFilePath: this.getConfigFilePath(),
			uiFilePath: this.getUIFilePath(),
			templatesDirPath: this.getTemplatesDir(),
		};
	}

	/**
	 * Get the path to the plugins directory
	 * @returns {string} Path to plugins directory
	 */
	getPluginsDir() {
		const configPath = this.config.paths?.pluginsDir || 'kernel/plugins';
		// If it's an absolute path, return as-is; otherwise resolve relative to project root
		if (path.isAbsolute(configPath)) {
			return configPath;
		}
		return path.join(this.projectRoot, configPath);
	}
}

// Create a singleton instance
const pathResolver = new KernelPathResolver();

// Export individual path functions for direct import
export const projectRoot = pathResolver.getProjectRoot();
export const kernelDir = pathResolver.getKernelDir();
export const contractDir = pathResolver.getContractDir();
export const generatedUIDir = pathResolver.getGeneratedUIDir();
export const servedUIDir = pathResolver.getServedUIDir();
export const electronPreloadPath = pathResolver.getElectronPreloadPath();
export const contextDir = pathResolver.getContextDir();
export const templatesDir = pathResolver.getTemplatesDir();

// Export the resolver instance for when more complex path operations are needed
export default pathResolver;
