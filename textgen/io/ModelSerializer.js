import path from 'path';
import fs from 'fs/promises';
import { TextModel } from '../models/Interfaces.js';
import { MarkovModel } from '../models/Markov/Model.js';
import { VLMModel } from '../models/VLMM/Model.js';
import { FileHandler } from './FileHandler.js';

/**
 * Handle saving and loading Text models
 * Supports JSON format with compression and metadata
 */
export class ModelSerializer {
	constructor(options = {}) {
		this.fileHandler = new FileHandler(options);
		this.compression = options.compression || false;
		this.includeMetadata = options.includeMetadata !== false;
	}

	/**
	 * Save a Text model to file
	 * @param {TextModel} model - Model to save
	 * @param {string} filename - Output filename
	 * @param {Object} options - Save options
	 */
	async saveModel(model, filename, options = {}) {
		if (!model || !(model instanceof TextModel)) {
			throw new Error('Invalid model provided');
		}

		if (!filename) {
			throw new Error('Filename is required');
		}

		const fullPath = this.fileHandler.resolveModelPath(filename);
		const dirPath = path.dirname(fullPath);

		await this.fileHandler.ensureDirectoryExists(dirPath);

		const modelData = {
			// Core model data
			...model.toJSON(),

			// Metadata (if enabled)
			...(this.includeMetadata && {
				metadata: {
					created: new Date().toISOString(),
				},
			}),
		};

		try {
			const jsonString = JSON.stringify(
				modelData,
				null,
				options.pretty ? 2 : 0,
			);
			await fs.writeFile(fullPath, jsonString, 'utf8');

			// Get file stats for confirmation
			const stats = await fs.stat(fullPath);
			console.log(
				`Model saved: ${this.fileHandler.formatFileSize(stats.size)}`,
			);
		} catch (error) {
			throw new Error(`Failed to save model to ${filename}: ${error.message}`);
		}
	}

	/**
	 * Load a Text model from file
	 * @param {string} filename - Model filename
	 * @returns {Promise<TextModel>} - Loaded model
	 */
	async loadModel(filename) {
		const fullPath = this.fileHandler.resolveModelPath(filename);

		try {
			const jsonString = await fs.readFile(fullPath, 'utf8');
			const modelData = JSON.parse(jsonString);

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

	/**
	 * Check if a model file exists
	 * @param {string} filename - The filename to check
	 * @returns {Promise<boolean>} - True if the model exists, false otherwise
	 */
	async modelExists(filename) {
		const fullPath = this.fileHandler.resolveModelPath(filename);

		try {
			await fs.access(fullPath);
			return true;
		} catch (error) {
			if (error.code === 'ENOENT') {
				return false;
			}
			throw new Error(`Error checking model existence: ${error.message}`);
		}
	}
}
