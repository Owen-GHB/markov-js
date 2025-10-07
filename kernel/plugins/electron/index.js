import { ElectronApp } from './ElectronApp.js';

/**
 * Electron plugin wrapper
 * Encapsulates the Electron plugin instantiation and exposes functional interface
 */

// Plugin instance (singleton)
let electronInstance = null;

/**
 * Initialize and get the Electron instance
 * @returns {ElectronApp} Electron plugin instance
 */
function getElectronInstance() {
  if (!electronInstance) {
    electronInstance = new ElectronApp();
  }
  return electronInstance;
}

/**
 * Start the Electron plugin
 * @param {Object} config - Configuration object
 * @param {Object} manifest - Manifest object
 * @returns {Promise<void>}
 */
export async function start(config, manifest, commandProcessor) {
  const electronApp = getElectronInstance();
  return await electronApp.start(config, manifest, commandProcessor);
}

/**
 * Expose the plugin's start method for direct usage
 */
export default {
  start
};