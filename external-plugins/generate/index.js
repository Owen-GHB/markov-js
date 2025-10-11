import { UI } from './UI.js';

/**
 * EJS-based Generator plugin wrapper
 * Encapsulates the EJS generator plugin instantiation and exposes functional interface
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
 * Run the EJS-based generator plugin
 * @param {Object} config - Configuration object
 * @param {Object} manifest - Manifest object
 * @param {Object} commandProcessor - CommandProcessor instance
 * @returns {Promise<void>}
 */
export async function run(config, manifest, commandProcessor) {
	const generator = getGeneratorInstance();
	return await generator.run(config, manifest, commandProcessor);
}

/**
 * Expose the plugin's run method for direct usage
 */
export default {
	run,
};