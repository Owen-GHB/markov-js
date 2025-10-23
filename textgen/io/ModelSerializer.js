import { TextModel } from '../models/Interfaces.js';
import { MarkovModel } from '../models/Markov/Model.js';
import { VLMModel } from '../models/VLMM/Model.js';


/**
 * Handle saving and loading Text models
 * Supports JSON format with compression and metadata
 */
export class ModelSerializer {
	constructor(options = {}) {
		this.includeMetadata = options.includeMetadata !== false;
	}

	/**
	 * Load a Text model from file
	 * @param {string} filename - Model filename
	 * @returns {Promise<TextModel>} - Loaded model
	 */
	async loadModel(modelData) {
		try {
			// Validate model data structure
			this.validateModelData(modelData);

			// Determine the correct model type
			let model;
			switch (modelData.modelType) {
				case 'markov':
					model = new MarkovModel({ order: modelData.order });
					break;
				case 'vlmm':
					model = new VLMModel({ order: modelData.order });
					break;
				default:
					throw new Error(`Unsupported model type: ${modelData.modelType}`);
			}

			model.fromJSON(modelData);

			if (modelData.metadata) {
				console.log(`Loaded model created: ${modelData.metadata.created}`);
			}

			return model;
		} catch (error) {
			if (error.code === 'ENOENT') {
				throw new Error(`Model file not found: ${fullPath}`);
			}
			if (error instanceof SyntaxError) {
				throw new Error(`Invalid JSON in model file: ${filename}`);
			}
			throw new Error(
				`Failed to load model from ${filename}: ${error.message}`,
			);
		}
	}

	/**
	 * Validate model data structure.
	 * @param {Object} modelData - Model data to validate.
	 */
	/**
	 * Validate the structure of model data
	 * @param {Object} modelData - The model data to validate
	 */
	validateModelData(modelData) {
		if (!modelData || typeof modelData !== 'object') {
			throw new Error('Invalid model data: not an object');
		}

		if (typeof modelData.order !== 'number' || modelData.order < 1) {
			throw new Error('Invalid model data: missing or invalid order');
		}

		if (!Array.isArray(modelData.vocabulary)) {
			throw new Error('Invalid model data: missing or invalid vocabulary');
		}
	}
}
