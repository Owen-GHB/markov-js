import { HTTPServer } from './HTTP.js';

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
function getHttpInstance(options) {
	if (!httpInstance) {
		httpInstance = new HTTPServer(options);
	}
	return httpInstance;
}

/**
 * Start the HTTP server plugin
 * @param {Object} config - Configuration object
 * @param {Object} options - HTTP server options
 * @returns {Promise<void>}
 */
export async function start(config, commandProcessor, options = {}) {
	const httpServer = getHttpInstance(options);
	return await httpServer.start(config, commandProcessor);
}

/**
 * Expose the plugin's start method for direct usage
 */
export default {
	start,
};
