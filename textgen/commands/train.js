import { Tokenizer } from '../models/Tokenizer.js';
import { MarkovModel } from '../models/Markov/Model.js';
import { VLMModel } from '../models/VLMM/Model.js';
import { HMModel } from '../models/HMM/Model.js';

/**
 * Train a model from a text corpus file
 * @param {Object} params - The parameters for training
 * @param {string} params.file - Corpus file to train from
 * @param {string} params.modelType - Type of model to train (markov, vlmm, hmm)
 * @param {number} params.order - Markov order (n-gram size)
 * @param {string} params.modelName - Filename to save the trained model
 * @param {boolean} params.caseSensitive - Whether to preserve case during tokenization
 * @param {boolean} params.trackStartStates - Whether to track sentence start states
 * @returns {Promise<Object>} - The result of the training
 */
export async function trainModel(params) {
	const { file, modelType, order = 2, modelName } = params || {};

	if (!file) {
		throw new Error('Training failed: file parameter is required');
	}

	const processor = new Tokenizer();
	const tokens = processor.tokenize(file, {
		method: 'word',
		preservePunctuation: true,
		preserveCase: false,
	});

	let model;
	switch (modelType) {
		case 'markov':
			model = new MarkovModel({ order });
			break;
		case 'vlmm':
			model = new VLMModel({ order });
			break;
		case 'hmm':
			model = new HMModel({ order });
			break;
		default:
			throw new Error(`Unknown model type: ${modelType}`);
	}
	
	model.train(tokens);

	// Generate filename if not provided
	let filename = modelName;
	if (!filename) {
		// Strip .txt extension and add .json
		filename = modelName.replace(/\.txt$/, '') + '.json';
	}
	// Ensure .json extension
	if (!filename.endsWith('.json')) {
		filename += '.json';
	}

	// Return both model and filename for the chain
	return {
		model: model,
		filename: filename
	};
}