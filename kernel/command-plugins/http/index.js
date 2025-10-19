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
	const { manifestReader, Runner, Parser } = await import(
		exportsUrl
	);
	const manifest = manifestReader(projectRoot);
	const runner = new Runner(
		commandRoot,
		projectRoot,
		manifest,
	);
	const parser = new Parser(manifest);

	const httpServer = getHttpInstance();

	// Start the server but don't return the server object
	await httpServer.start(
		serverPort,
		servedUIDir,
		apiEndpoint,
		runner,
		parser,
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
