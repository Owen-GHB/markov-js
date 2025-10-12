/**
 * Delete a saved model file
 * @function deleteModelFile
 * @param {Object} params - The parameters for deletion
 * @param {string} params.modelName - Model filename to delete
 * @returns {Promise<Object>} - The result of the deletion
 */

/**
 * List available saved models
 * @function listAvailableModels
 * @returns {Promise<Object>} - The list of models
 */

/**
 * List available corpus files
 * @function listCorpusFiles
 * @returns {Promise<Object>} - The list of corpus files
 */

// File operations functions
export * from './model-operations.js';
export * from './corpus-operations.js';
