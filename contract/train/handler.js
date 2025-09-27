import { Tokenizer } from '../../textgen/models/Tokenizer.js';
import { FileHandler } from '../../textgen/io/FileHandler.js';
import { ModelSerializer } from '../../textgen/io/ModelSerializer.js';
import { MarkovModel } from '../../textgen/models/Markov/Model.js';
import { VLMModel } from '../../textgen/models/VLMM/Model.js';
import { HMModel } from '../../textgen/models/HMM/Model.js';

/**
 * Handle the "train" command
 * @param {Object} params - The command parameters
 * @returns {Promise<Object>} - The result of the training
 */
export default async function handleTrain(params) {
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
				return {
					error: `Unknown model type: ${modelType}`,
					output: null,
				};
		}
		model.train(tokens);
		await serializer.saveModel(model, modelName);

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
