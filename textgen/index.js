// Main textgen module exports
import { trainModel } from './core/train.js';
import { generateText } from './core/generate.js';
import { deleteModelFile } from './fileOps/model-operations.js';
import { listAvailableModels } from './fileOps/model-operations.js';
import { listCorpusFiles } from './fileOps/corpus-operations.js';
import { searchGutenberg } from './sources/gutenberg.js';
import { getGutenbergInfo } from './sources/gutenberg.js';
import { downloadGutenberg } from './sources/gutenberg.js';

/**
 * Train a model from a text corpus file
 * @function trainModel
 * @param {Object} params - The parameters for training
 * @param {string} params.file - Corpus file to train from
 * @param {string} params.modelType - Type of model to train (markov, vlmm, hmm)
 * @param {number} params.order - Markov order (n-gram size)
 * @param {string} params.modelName - Filename to save the trained model
 * @param {boolean} params.caseSensitive - Whether to preserve case during tokenization
 * @param {boolean} params.trackStartStates - Whether to track sentence start states
 * @returns {Promise<Object>} - The result of the training
 */

/**
 * Generate text from a trained model
 * @function generateText
 * @param {Object} params - The parameters for generation
 * @param {string} params.modelName - Model file to use for generation
 * @param {number} params.length - Maximum number of tokens to generate
 * @param {number} params.min_tokens - Minimum number of tokens to generate
 * @param {number} params.temperature - Randomness factor (0-2)
 * @param {string} params.prompt - Starting text for generation
 * @param {Array} params.stop - Stop tokens that end generation
 * @param {number} params.samples - Number of samples to generate
 * @param {boolean} params.allowRepetition - Allow immediate token repetition
 * @returns {Promise<Object>} - The result of the generation
 */

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
 * Search Project Gutenberg by title/author
 * @function searchGutenberg
 * @param {Object} params - The search parameters
 * @param {string} params.query - Search query
 * @returns {Promise<Object>} - Search results
 */

/**
 * Get book details from Project Gutenberg
 * @function getGutenbergInfo
 * @param {Object} params - The parameters for getting book info
 * @param {number|string} params.id_or_title - Book ID or title to look up
 * @returns {Promise<Object>} - Book details
 */

/**
 * Download book from Project Gutenberg
 * @function downloadGutenberg
 * @param {Object} params - The parameters for downloading
 * @param {number|string} params.id_or_title - Book ID or title to download
 * @param {string} params.file - Filename to save as (optional)
 * @returns {Promise<Object>} - Download result
 */

// Export the explicit API functions
export default {
  trainModel,
  generateText,
  deleteModelFile,
  listAvailableModels,
  listCorpusFiles,
  searchGutenberg,
  getGutenbergInfo,
  downloadGutenberg
};

// Also export individually for direct access
export {
  trainModel,
  generateText,
  deleteModelFile,
  listAvailableModels,
  listCorpusFiles,
  searchGutenberg,
  getGutenbergInfo,
  downloadGutenberg
};