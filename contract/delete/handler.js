import { FileHandler } from '../../textgen/io/FileHandler.js';
import { ModelSerializer } from '../../textgen/io/ModelSerializer.js';

/**
 * Handle the "delete" command
 * @param {Object} params - The command parameters
 * @returns {Promise<Object>} - The result of the deletion
 */
export default async function handleDelete(params) {
	const { modelName } = params || {};

	if (!modelName) {
		return {
			error: "Model name is required (e.g., delete('model.json'))",
			output: null,
		};
	}

	try {
		const serializer = new ModelSerializer();
		await serializer.deleteModel(modelName);
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
