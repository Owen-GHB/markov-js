import { UI } from './UI.js';

/**
 * Generator plugin wrapper
 * Encapsulates the generator plugin instantiation and exposes functional interface
 */

// Plugin instance (singleton)
let generatorInstance = null;

/**
 * Initialize and get the generator instance
 * @returns {UI} Generator plugin instance
 */
function getGeneratorInstance() {
  if (!generatorInstance) {
    generatorInstance = new UI();
  }
  return generatorInstance;
}

/**
 * Run the generator plugin
 * @param {Object} config - Configuration object
 * @param {Object} manifest - Manifest object
 * @returns {Promise<void>}
 */
export async function run(config, manifest) {
  const generator = getGeneratorInstance();
  return await generator.run(config, manifest);
}

/**
 * Expose the plugin's run method for direct usage
 */
export default {
  run
};