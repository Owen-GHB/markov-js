import { HTTPServer } from './HTTP.js';

/**
 * HTTP plugin wrapper
 * Encapsulates the HTTP plugin instantiation and exposes functional interface
 */

// Plugin instance (singleton)
let httpInstance = null;

/**
 * Initialize and get the HTTP instance
 * @param {Object} config - Configuration object
 * @returns {HTTPServer} HTTP plugin instance
 */
function getHttpInstance(config) {
	if (!httpInstance) {
		httpInstance = new HTTPServer(config);
	}
	return httpInstance;
}

/**
 * Start the HTTP server plugin
 * @param {Object} config - Configuration object
 * @param {Object} commandProcessor - Command processor instance
 * @returns {Promise<void>}
 */
export async function start(config, commandProcessor) {
	const httpServer = getHttpInstance(config);
	return await httpServer.start(config, commandProcessor);
}

/**
 * Expose the plugin's start method for direct usage
 */
export default {
	start,
};
