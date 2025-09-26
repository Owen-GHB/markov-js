import { Tokenizer } from '../../models/Tokenizer.js';
import { FileHandler } from '../../io/FileHandler.js';
import { ModelSerializer } from '../../io/ModelSerializer.js';
import { MarkovModel } from '../../models/Markov/Model.js';
import { VLMModel } from '../../models/VLMM/Model.js';
import { HMModel } from '../../models/HMM/Model.js';

export class TrainHandler {
	constructor() {
		this.processor = new Tokenizer();
		this.fileHandler = new FileHandler();
		this.serializer = new ModelSerializer();
	}

	/**
	 * Handle the "train" command
	 * @param {Object} params - The command parameters
	 * @returns {Promise<Object>} - The result of the training
	 */
	async handleTrain(params) {
		const output = [];
		const { file, modelType, order = 2 } = params || {};
		const modelName =
			params?.modelName || `${file.replace(/\.[^/.]+$/, '')}.json`;

		if (!file) {
			return {
				error: 'Training failed: file parameter is required',
				output: null,
			};
		}

		try {
			const text = await this.fileHandler.readTextFile(file);
			const tokens = this.processor.tokenize(text, {
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
					return {
						error: `Unknown model type: ${modelType}`,
						output: null,
					};
			}
			model.train(tokens);
			await this.serializer.saveModel(model, modelName);

			const stats = model.getStats();
			output.push(
				`📚 Trained from "${file}" → "${modelName}"`,
				`📊 Vocabulary: ${stats.vocabularySize.toLocaleString()}`,
			);

			return { error: null, output: output.join('\n') };
		} catch (err) {
			return {
				error: `Training failed: ${err.message}`,
				output: null,
			};
		}
	}
}
