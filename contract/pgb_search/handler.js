import { searchGutenberg } from '../../textgen/index.js';

/**
 * Handle the "pgb_search" command
 * @param {Object} params - The command parameters
 * @returns {Promise<Object>} - The result of the search
 */
export default async function handlePgbSearch(params) {
	return await searchGutenberg(params);
}
