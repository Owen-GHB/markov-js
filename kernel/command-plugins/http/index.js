import { HTTPServer } from './HTTP.js';
import { HTTPExecutor } from './HTTPExecutor.js';

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
 * @returns {Promise<void>}
 */
export async function start(
	kernelPath,
	commandRoot,
	projectRoot,
	serverPort,
	servedUIDir,
	apiEndpoint,
) {
	const httpServer = getHttpInstance();
	const executor = new HTTPExecutor(kernelPath, commandRoot, projectRoot);
	await executor.init();

	// Start the server but don't return the server object
	httpServer.start(
		serverPort,
		servedUIDir,
		apiEndpoint,
		executor
	);

	// Return a clean success message instead of the server object
	return `HTTP server started on port ${serverPort}`;
}

/**
 * Expose the plugin's start method for direct usage
 */
export default {
	start,
};
