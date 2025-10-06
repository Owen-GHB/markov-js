import { HTTPServer } from './HTTP.js';

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
 * @param {Object} config - Configuration object
 * @param {Object} manifest - Manifest object
 * @param {Object} options - HTTP server options
 * @returns {Promise<void>}
 */
export async function start(config, manifest, options = {}) {
  const httpServer = getHttpInstance();
  return await httpServer.start(config, manifest, options);
}

/**
 * Expose the plugin's start method for direct usage
 */
export default {
  start
};