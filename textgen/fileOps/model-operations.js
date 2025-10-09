import { ModelSerializer } from '../io/ModelSerializer.js';

/**
 * Delete a saved model file
 * @param {Object} params - The parameters for deletion
 * @param {string} params.modelName - Model filename to delete
 * @returns {Promise<string>} - Success message
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
 * @returns {Promise<Object>} - Model list object with filename, size, order, totalStates, and vocabularySize
 */
export async function listAvailableModels() {
	const serializer = new ModelSerializer();
	const models = await serializer.listModels();
	if (models.length === 0) {
		return { type: 'message', content: 'No models found in models directory', count: 0 };
	}

	return {
		type: 'model_list',
		count: models.length,
		models: models.map(model => ({
			filename: model.filename,
			size: model.size,
			order: model.order,
			totalStates: model.states,
			vocabularySize: model.vocabulary
		}))
	};
}
