import { CLI } from './CLI.js';

/**
 * CLI plugin wrapper
 * Encapsulates the CLI plugin instantiation and exposes functional interface
 */

// Plugin instance (singleton)
let cliInstance = null;

/**
 * Initialize and get the CLI instance
 * @param {Object} config - Configuration object
 * @returns {CLI} CLI plugin instance
 */
function getCliInstance(config, commandProcessor) {
	if (!cliInstance) {
		cliInstance = new CLI(config, commandProcessor);
	}
	return cliInstance;
}

/**
 * Run the CLI plugin
 * @param {Object} config - Configuration object
 * @param {Object} commandProcessor - Command processor instance
 * @param {string[]} args - Command line arguments
 * @returns {Promise<void>}
 */
export async function run(config, commandProcessor, args) {
	const cli = getCliInstance(config, commandProcessor);
	return await cli.run(args);
}

/**
 * Expose the plugin's run method for direct usage
 */
export default {
	run,
};
