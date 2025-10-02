import { listAvailableModels } from '../../textgen/index.js';

/**
 * Handle the "listModels" command
 * @returns {Promise<Object>} - The list of models
 */
export default async function handleListModels() {
	return await listAvailableModels();
}
