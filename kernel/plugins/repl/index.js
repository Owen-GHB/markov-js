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
 * @param {Object} config - Configuration object
 * @param {Object} commandProcessor - Command processor instance
 * @returns {Promise<void>}
 */
export async function start(config, commandProcessor) {
  const repl = getReplInstance();
  return await repl.start(config, commandProcessor);
}

/**
 * Expose the plugin's start method for direct usage
 */
export default {
  start,
};