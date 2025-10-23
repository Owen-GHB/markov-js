import { ModelSerializer } from '../io/ModelSerializer.js';
import { GenerationContext } from '../models/Interfaces.js';

/**
 * Generate text from a trained model
 * @param {Object} params - The parameters for generation
 * @param {Object} params.modelData - Model data object for generation
 * @param {number} params.length - Maximum number of tokens to generate
 * @param {number} params.min_tokens - Minimum number of tokens to generate
 * @param {number} params.temperature - Randomness factor (0-2)
 * @param {string} params.prompt - Starting text for generation
 * @param {Array} params.stop - Stop tokens that end generation
 * @param {number} params.samples - Number of samples to generate
 * @param {boolean} params.allowRepetition - Allow immediate token repetition
 * @returns {Promise<Object>} - The generation results as pure data
 */
export async function generateText(params) {
	const { modelData, length = 100, temperature = 1.0, samples = 1, ...rest } = params || {};
    const serializer = new ModelSerializer();
    const model = await serializer.loadModel(modelData);
	const context = new GenerationContext({
		max_tokens: length,
		temperature: temperature,
		...rest,
	});
	const result = model.generate(context);
	// Return pure data object
	return result
}