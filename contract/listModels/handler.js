import { FileHandler } from '../../textgen/io/FileHandler.js';
import { ModelSerializer } from '../../textgen/io/ModelSerializer.js';

/**
 * Handle the "listModels" command
 * @returns {Promise<Object>} - The list of models
 */
export default async function handleListModels() {
	try {
		const serializer = new ModelSerializer();
		const models = await serializer.listModels();
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
