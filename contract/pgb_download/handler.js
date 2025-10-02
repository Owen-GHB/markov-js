import { downloadGutenberg } from '../../textgen/index.js';

/**
 * Handle the "pgb_download" command
 * @param {Object} params - The command parameters
 * @returns {Promise<Object>} - The result of the download
 */
export default async function handlePgbDownload(params) {
	return await downloadGutenberg(params);
}
