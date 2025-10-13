import path from 'path';
import { pathToFileURL } from 'url';

/**
 * KernelLoader - Dynamically loads kernel modules using provided paths
 */
export class KernelLoader {
    constructor(kernelPath) {
        this.kernelPath = kernelPath;
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
	 * Gets the manifest using the dynamic contract loader
	 * @param {string} projectRoot - The project root path
	 * @returns {Promise<Object>} - The manifest
	 */
	async getManifest(projectRoot) {
		const { manifestReader } = await this.importKernelModule('contract.js');
		return manifestReader(projectRoot);
	}


    /**
     * Creates a CommandProcessor instance using dynamically loaded modules
     * @param {Object} config - The configuration object
     * @param {Object} manifest - The manifest object
     * @returns {Promise<Object>} - The CommandProcessor instance
     */
    async createCommandProcessor(projectRoot, manifest) {
        const { CommandProcessor } = await this.importKernelModule(
            'processor/CommandProcessor.js',
        );
        return new CommandProcessor(projectRoot, manifest);
    }
}
