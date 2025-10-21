import { CLI } from './CLI.js';

/**
 * CLI plugin wrapper
 * Encapsulates the CLI plugin instantiation and exposes functional interface
 */

// Plugin instance (singleton)
let cliInstance = null;

/**
 * Initialize and get the CLI instance
 * @param {string} kernelPath - Path to kernel directory
 * @param {string} commandRoot - Command root directory  
 * @param {string} projectRoot - Project root directory
 * @param {string} contextFilePath - Path to context file for state persistence
 * @returns {CLI} CLI plugin instance
 */
function getCliInstance(commandRoot, projectRoot, contextFilePath) {
  if (!cliInstance) {
    cliInstance = new CLI(commandRoot, projectRoot, contextFilePath);
  }
  return cliInstance;
}

/**
 * Run the CLI plugin
 * @param {string} kernelPath - Path to kernel directory
 * @param {string} commandRoot - Command root directory
 * @param {string} projectRoot - Project root directory  
 * @param {string} contextFilePath - Path to context file for state persistence
 * @param {string[]} args - Command line arguments
 * @returns {Promise<void>}
 */
export async function run(commandRoot, projectRoot, contextFilePath, args) {
  const cli = getCliInstance(commandRoot, projectRoot, contextFilePath);
  return await cli.run(args);
}

/**
 * Expose the plugin's run method for direct usage
 */
export default {
  run,
};