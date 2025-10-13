import { CLI } from './CLI.js';

/**
 * CLI plugin wrapper
 * Encapsulates the CLI plugin instantiation and exposes functional interface
 */

// Plugin instance (singleton)
let cliInstance = null;

/**
 * Initialize and get the CLI instance
 * @param {string} contextFilePath - Path to context file for state persistence
 * @param {string} kernelPath - Path to kernel directory
 * @returns {CLI} CLI plugin instance
 */
function getCliInstance(contextFilePath, kernelPath, projectRoot) {
	if (!cliInstance) {
		cliInstance = new CLI(contextFilePath, kernelPath, projectRoot);
	}
	return cliInstance;
}

/**
 * Run the CLI plugin
 * @param {string} contextFilePath - Path to context file for state persistence
 * @param {string} kernelPath - Path to kernel directory
 * @param {string[]} args - Command line arguments
 * @returns {Promise<void>}
 */
export async function run(contextFilePath, kernelPath, args) {
	const projectRoot = process.cwd();
	const cli = getCliInstance(contextFilePath, kernelPath, projectRoot);
	return await cli.run(args);
}

/**
 * Expose the plugin's run method for direct usage
 */
export default {
	run,
};
