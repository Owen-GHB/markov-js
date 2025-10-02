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
    return {
      error: "Model name is required",
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

/**
 * List available saved models
 * @returns {Promise<Object>} - The list of models
 */
export async function listAvailableModels() {
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