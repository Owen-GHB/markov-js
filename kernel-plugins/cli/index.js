import { CLI } from './CLI.js';

/**
 * CLI plugin wrapper
 * Encapsulates the CLI plugin instantiation and exposes functional interface
 */

// Plugin instance (singleton)
let cliInstance = null;

/**
 * Initialize and get the CLI instance
 * @param {Object} contextFilePath - Path to context file for state persistence
 * @param {Object} commandProcessor - Command processor instance
 * @returns {CLI} CLI plugin instance
 */
function getCliInstance(contextFilePath, commandProcessor) {
	if (!cliInstance) {
		cliInstance = new CLI(contextFilePath, commandProcessor);
	}
	return cliInstance;
}

/**
 * Run the CLI plugin
 * @param {Object} contextFilePath - Path to context file for state persistence
 * @param {Object} commandProcessor - Command processor instance
 * @param {string[]} args - Command line arguments
 * @returns {Promise<void>}
 */
export async function run(contextFilePath, commandProcessor, args) {
	const cli = getCliInstance(contextFilePath, commandProcessor);
	return await cli.run(args);
}

/**
 * Expose the plugin's run method for direct usage
 */
export default {
	run,
};
