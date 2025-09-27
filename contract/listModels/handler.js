import { FileHandler } from '../../textgen/io/FileHandler.js';
import { ModelSerializer } from '../../textgen/io/ModelSerializer.js';

export class ListModelsHandler {
	constructor() {
		this.serializer = new ModelSerializer();
		this.fileHandler = new FileHandler();
	}

	/**
	 * Handle the "listModels" command
	 * @returns {Promise<Object>} - The list of models
	 */
	async handleListModels() {
		try {
			const models = await this.serializer.listModels();
			if (models.length === 0) {
				return { error: null, output: 'No models found in models directory' };
			}

			const output = [
				'📁 Saved Models:',
				'----------------',
				...models.map(
					(model) =>
						`• ${model.filename} (${model.sizeFormatted}, order ${model.order})`,
				),
				`\nTotal: ${models.length} model(s)`,
			];

			return { error: null, output: output.join('\n') };
		} catch (error) {
			return { error: `Failed to list models: ${error.message}`, output: null };
		}
	}

	/**
	 * Handle the "listcorpus" command
	 * @returns {Promise<Object>} - The list of corpus files
	 */
	async handleListCorpus() {
		try {
			const corpusFiles = await this.fileHandler.listCorpusFiles();
			if (corpusFiles.length === 0) {
				return {
					error: null,
					output: 'No corpus files found in corpus directory',
				};
			}

			const output = [
				'📄 Corpus Files:',
				'----------------',
				...corpusFiles.map((file) => `• ${file}`),
				`\nTotal: ${corpusFiles.length} file(s)`,
			];

			return { error: null, output: output.join('\n') };
		} catch (error) {
			return {
				error: `Failed to list corpus files: ${error.message}`,
				output: null,
			};
		}
	}

	/**
	 * Handle the "deletemodel" command
	 * @param {Object} params - The command parameters
	 * @returns {Promise<Object>} - The result of the deletion
	 */
	async handleDeleteModel(params) {
		const { modelName } = params || {};

		if (!modelName) {
			return {
				error: "Model name is required (e.g., delete('model.json'))",
				output: null,
			};
		}

		try {
			await this.serializer.deleteModel(modelName);
			return {
				error: null,
				output: `✅ Successfully deleted model: ${modelName}`,
			};
		} catch (error) {
			return {
				error: `Failed to delete model: ${error.message}`,
				output: null,
			};
		}
	}
}
