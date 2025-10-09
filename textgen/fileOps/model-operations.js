import { ModelSerializer } from '../io/ModelSerializer.js';

/**
 * Delete a saved model file
 * @param {Object} params - The parameters for deletion
 * @param {string} params.modelName - Model filename to delete
 * @returns {Promise<Object>} - The result of the deletion
 */
export async function deleteModelFile(params) {
	const { modelName } = params || {};

	if (!modelName) {
		throw new Error('Model name is required');
	}

	const serializer = new ModelSerializer();
	await serializer.deleteModel(modelName);
	return `✅ Successfully deleted model: ${modelName}`;
}

/**
 * List available saved models
 * @returns {Promise<Object>} - The list of models
 */
export async function listAvailableModels() {
	const serializer = new ModelSerializer();
	const models = await serializer.listModels();
	if (models.length === 0) {
		return 'No models found in models directory';
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

	return output.join('\n');
}