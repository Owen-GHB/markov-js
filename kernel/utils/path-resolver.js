import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Centralized path resolver for the entire kernel
 * Provides consistent path resolution based on provided base paths
 * Focuses on kernel-specific and project structure paths only
 */
class PathResolver {
	/**
	 * Creates a path resolver with the given project root and config
	 * @param {string} projectRoot - The project root directory
	 * @param {Object} rawConfig - The raw configuration object from config file
	 */
	constructor(projectRoot, rawConfig = {}) {
		this.projectRoot = projectRoot;
		this.config = rawConfig;

		// Calculate kernel directory relative to this file's location
		// This file is at kernel/utils/path-resolver.js, so kernel dir is the parent of utils/
		const currentFileDir = path.dirname(fileURLToPath(import.meta.url)); // kernel/utils/
		this.calculatedKernelDir = path.dirname(currentFileDir); // Go up one level from utils/ to get kernel/
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
		return this.calculatedKernelDir;
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

// Export the class for consumers to create instances with project root and config
export default PathResolver;

// Also export for direct import
export { PathResolver };
