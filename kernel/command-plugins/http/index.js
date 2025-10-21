import { HTTPServer } from './HTTP.js';
import { Vertex } from 'vertex-kernel';

// Plugin instance (singleton)
let httpInstance = null;

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
	commandRoot,
	projectRoot,
	serverPort,
	servedUIDir,
	apiEndpoint,
) {
	const vertex = new Vertex(commandRoot, projectRoot);

	const httpServer = getHttpInstance();
	
	// Start the server but don't return the server object
	httpServer.start(
		serverPort,
		servedUIDir,
		apiEndpoint,
		vertex
	);

	// Return a clean success message instead of the server object
	return `HTTP server started on port ${serverPort}`;
}

export default {
	start,
};