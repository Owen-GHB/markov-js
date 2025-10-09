import { ModelSerializer } from '../io/ModelSerializer.js';
import { GenerationContext } from '../models/Interfaces.js';

/**
 * Generate text from a trained model
 * @param {Object} params - The parameters for generation
 * @param {string} params.modelName - Model file to use for generation
 * @param {number} params.length - Maximum number of tokens to generate
 * @param {number} params.min_tokens - Minimum number of tokens to generate
 * @param {number} params.temperature - Randomness factor (0-2)
 * @param {string} params.prompt - Starting text for generation
 * @param {Array} params.stop - Stop tokens that end generation
 * @param {number} params.samples - Number of samples to generate
 * @param {boolean} params.allowRepetition - Allow immediate token repetition
 * @returns {Promise<Object>} - Generation result object
 */
export async function generateText(params) {
	const {
		modelName,
		length = 100,
		temperature = 1.0,
		samples = 1,
		...rest
	} = params || {};

	if (!modelName) {
		throw new Error('Generation failed: modelName is required');
	}

	const serializer = new ModelSerializer();
	const model = await serializer.loadModel(modelName);

	const context = new GenerationContext({
		max_tokens: length,
		temperature: temperature,
		...rest,
	});

	const results =
		samples === 1
			? [model.generate(context)]
			: model.generateSamples(samples, context);

	// Process results to extract relevant information
	const processedResults = results.map(result => {
		if (result.error) {
			return {
				success: false,
				error: result.error
			};
		} else {
			return {
				success: true,
				text: result.text,
				length: result.length,
				finishReason: result.finish_reason
			};
		}
	});

	return {
		type: 'generation_result',
		model: modelName,
		sampleCount: samples,
		results: processedResults
	};
}
