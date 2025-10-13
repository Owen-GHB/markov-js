import { REPL } from './REPL.js';

/**
 * REPL plugin wrapper
 * Encapsulates the REPL plugin instantiation and exposes functional interface
 */

// Plugin instance (singleton)
let replInstance = null;

/**
 * Initialize and get the REPL instance
 * @returns {REPL} REPL plugin instance
 */
function getReplInstance() {
	if (!replInstance) {
		replInstance = new REPL();
	}
	return replInstance;
}

/**
 * Start the REPL plugin
 * @param {Object} contextFilePath - Path to context file for state persistence
 * @param {Object} historyFilePath - Path to history file for command history
 * @param {number} maxHistory - Maximum number of history entries to keep
 * @param {Object} commandProcessor - Command processor instance
 * @returns {Promise<void>}
 */
export async function start(contextFilePath, historyFilePath, maxHistory, kernelPath, projectRoot = process.cwd()) {
	const repl = getReplInstance();
	return await repl.start(contextFilePath, historyFilePath, maxHistory, kernelPath, projectRoot);
}

/**
 * Expose the plugin's start method for direct usage
 */
export default {
	start,
};
