// Main textgen module exports
import { trainModel } from './core/train.js';
import { generateText } from './core/generate.js';

/**
 * Train a model from a text corpus file
 * @function trainModel
 * @param {Object} params - The parameters for training
 * @param {string} params.file - Corpus file to train from
 * @param {string} params.modelType - Type of model to train (markov, vlmm, hmm)
 * @param {number} params.order - Markov order (n-gram size)
 * @param {string} params.modelName - Filename to save the trained model
 * @param {boolean} params.caseSensitive - Whether to preserve case during tokenization
 * @param {boolean} params.trackStartStates - Whether to track sentence start states
 * @returns {Promise<Object>} - The result of the training
 */

/**
 * Generate text from a trained model
 * @function generateText
 * @param {Object} params - The parameters for generation
 * @param {string} params.modelName - Model file to use for generation
 * @param {number} params.length - Maximum number of tokens to generate
 * @param {number} params.min_tokens - Minimum number of tokens to generate
 * @param {number} params.temperature - Randomness factor (0-2)
 * @param {string} params.prompt - Starting text for generation
 * @param {Array} params.stop - Stop tokens that end generation
 * @param {number} params.samples - Number of samples to generate
 * @param {boolean} params.allowRepetition - Allow immediate token repetition
 * @returns {Promise<Object>} - The result of the generation
 */

// Export the explicit API functions
export default {
	trainModel,
	generateText,
};

// Also export individually for direct access
export {
	trainModel,
	generateText,
};
