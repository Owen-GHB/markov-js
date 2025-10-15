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

/**
 * Upload a text file to the corpus
 * @function uploadCorpusFile
 * @param {Object} params - The parameters for upload
 * @param {Object} params.file - The file blob to upload
 * @param {string} params.filename - Optional custom filename
 * @returns {Promise<Object>} - The result of the upload
 */

export * from './data-operations.js';