import { REPL } from './REPL.js';
import { CLI } from './CLI.js';

/**
 * Stdio plugin wrapper
 * Encapsulates the stdio plugin instantiation and exposes functional interface
 */

// Plugin instances (singletons)
let replInstance = null;
let cliInstance = null;

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
 * Initialize and get the CLI instance
 * @param {Object} config - Configuration object
 * @param {Object} manifest - Manifest object
 * @returns {CLI} CLI plugin instance
 */
function getCliInstance(config, manifest, commandProcessor) {
	if (!cliInstance) {
		cliInstance = new CLI(config, commandProcessor);
	}
	return cliInstance;
}

/**
 * Start the REPL plugin
 * @param {Object} config - Configuration object
 * @param {Object} manifest - Manifest object
 * @returns {Promise<void>}
 */
export async function start(config, manifest, commandProcessor) {
	const repl = getReplInstance();
	return await repl.start(config, commandProcessor);
}

/**
 * Run the CLI plugin
 * @param {Object} config - Configuration object
 * @param {Object} manifest - Manifest object
 * @param {string[]} args - Command line arguments
 * @returns {Promise<void>}
 */
export async function run(config, manifest, commandProcessor, args) {
	const cli = getCliInstance(config, manifest, commandProcessor);
	return await cli.run(args);
}

/**
 * Expose the plugin's start and run methods for direct usage
 */
export default {
	start,
	run,
};
