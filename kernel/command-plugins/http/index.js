import { HTTPServer } from './HTTP.js';
import path from 'path';
import { pathToFileURL } from 'url';

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
export async function start(
	kernelPath,
	commandRoot,
	projectRoot,
	serverPort,
	servedUIDir,
	apiEndpoint,
) {
	const exportsUrl = pathToFileURL(path.join(kernelPath, 'exports.js')).href;
	const { manifestReader, CommandProcessor, CommandParser } = await import(
		exportsUrl
	);
	const manifest = manifestReader(projectRoot);
	const commandProcessor = new CommandProcessor(
		commandRoot,
		projectRoot,
		manifest,
	);
	const commandParser = new CommandParser(manifest);

	const httpServer = getHttpInstance();

	// Start the server but don't return the server object
	await httpServer.start(
		serverPort,
		servedUIDir,
		apiEndpoint,
		commandProcessor,
		commandParser,
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
