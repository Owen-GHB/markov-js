import { deleteModelFile } from '../../textgen/index.js';

/**
 * Handle the "delete" command
 * @param {Object} params - The command parameters
 * @returns {Promise<Object>} - The result of the deletion
 */
export default async function handleDelete(params) {
	return await deleteModelFile(params);
}
