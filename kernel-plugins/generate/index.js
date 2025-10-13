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
 * @param {string} userTemplateDir - Directory for user templates
 * @param {string} generatedUIDir - Directory for generated UI output
 * @param {Object} manifest - Manifest object
 * @returns {Promise<void>}
 */
export async function run(
	userTemplateDir,
	generatedUIDir,
	manifest
) {
	const generator = getGeneratorInstance();
	return await generator.run(
		userTemplateDir,
		generatedUIDir,
		manifest
	);
}

/**
 * Expose the plugin's run method for direct usage
 */
export default {
	run,
};
