import path from 'path';
import { pathToFileURL } from 'url';

/**
 * KernelLoader - Dynamically loads kernel modules using provided paths
 */
export class KernelLoader {
	constructor(kernelPath, projectRoot) {
		this.kernelPath = kernelPath;
		this.projectRoot = projectRoot;
	}

	/**
	 * Dynamically import a kernel module
	 * @param {string} modulePath - Path relative to the kernel directory (e.g., 'utils/config-loader.js')
	 * @returns {Promise<Object>} - The imported module
	 */
	async importKernelModule(modulePath) {
		const fullPath = path.join(this.kernelPath, modulePath);
		const moduleUrl = pathToFileURL(fullPath).href;
		return await import(moduleUrl);
	}

	/**
	 * Builds the configuration using the dynamic config loader
	 * @returns {Promise<Object>} - The built configuration
	 */
	async buildConfig() {
		const { buildConfig } = await this.importKernelModule(
			'utils/config-loader.js',
		);
		return buildConfig(this.projectRoot);
	}

	/**
	 * Gets the manifest using the dynamic contract loader
	 * @param {string} contractDir - The contract directory path
	 * @param {string} projectRoot - The project root path
	 * @returns {Promise<Object>} - The manifest
	 */
	async getManifest(contractDir, projectRoot) {
		const { manifestReader } = await this.importKernelModule('contract.js');
		return manifestReader(contractDir, projectRoot);
	}

	/**
	 * Creates a CommandProcessor instance using dynamically loaded modules
	 * @param {Object} config - The configuration object
	 * @param {Object} manifest - The manifest object
	 * @returns {Promise<Object>} - The CommandProcessor instance
	 */
	async createCommandProcessor(config, manifest) {
		const { CommandProcessor } = await this.importKernelModule(
			'processor/CommandProcessor.js',
		);
		return new CommandProcessor(config, manifest);
	}
}
