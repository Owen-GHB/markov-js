import { getGutenbergInfo } from '../../textgen/index.js';

/**
 * Handle the "pgb_info" command
 * @param {Object} params - The command parameters
 * @returns {Promise<Object>} - The result of getting book info
 */
export default async function handlePgbInfo(params) {
	return await getGutenbergInfo(params);
}
