import { HTTPServer } from './HTTP.js';
import { importVertex } from './imports.js';

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
	kernelPath,
	commandRoot,
	projectRoot,
	serverPort,
	servedUIDir,
	apiEndpoint,
) {
	const Vertex = await importVertex(kernelPath);
	const kernel = new Vertex();
	const executor = new kernel.Executor(commandRoot, projectRoot);

	const httpServer = getHttpInstance();
	
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

export default {
	start,
};