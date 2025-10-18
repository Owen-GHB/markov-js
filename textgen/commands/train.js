import { Tokenizer } from '../models/Tokenizer.js';
import { FileHandler } from '../io/FileHandler.js';
import { ModelSerializer } from '../io/ModelSerializer.js';
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
	const { file, modelType, order = 2 } = params || {};
	const modelName = params?.modelName || `${file.replace(/\.[^/.]+$/, '')}.json`;

	if (!file) {
		throw new Error('Training failed: file parameter is required');
	}

	const processor = new Tokenizer();
	const fileHandler = new FileHandler();
	const serializer = new ModelSerializer();

	const text = await fileHandler.readTextFile(file);
	const tokens = processor.tokenize(text, {
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
	await serializer.saveModel(model, modelName);

	const stats = model.getStats();
	
	// Return data object instead of formatted string
	return {
		file: file,
		modelName: modelName,
		vocabularySize: stats.vocabularySize,
		modelType: modelType,
		order: order
	};
}
