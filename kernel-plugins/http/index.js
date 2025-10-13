import { HTTPServer } from './HTTP.js';
import { KernelLoader } from '../shared/KernelLoader.js';

/**
 * HTTP plugin wrapper
 * Encapsulates the HTTP plugin instantiation and exposes functional interface
 */

// Plugin instance (singleton)
let httpInstance = null;

/**
 * Initialize and get the HTTP instance
 * @returns {HTTPServer} HTTP plugin instance
 */
function getHttpInstance() {
	if (!httpInstance) {
		httpInstance = new HTTPServer();
	}
	return httpInstance;
}

/**
 * Start the HTTP server plugin
 * @param {number} port - Port number for the server
 * @param {string} servedUIDir - Directory to serve static UI files from
 * @param {string} apiEndpoint - API endpoint path
 * @param {Object} commandProcessor - Command processor instance
 * @returns {Promise<void>}
 */
export async function start(kernelPath, projectRoot, port, servedUIDir, apiEndpoint) {
	const kernelLoader = new KernelLoader(kernelPath);
	const manifest = await kernelLoader.getManifest(projectRoot);
	const commandProcessor = await kernelLoader.createCommandProcessor(
		projectRoot,
		manifest,
	);
	const httpServer = getHttpInstance();
	return await httpServer.start(port, servedUIDir, apiEndpoint, commandProcessor);
}

/**
 * Expose the plugin's start method for direct usage
 */
export default {
	start,
};
