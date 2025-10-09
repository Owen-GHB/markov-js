import { GutenbergService } from './gutenberg-service.js';

// Create a singleton instance of the service
const gutenbergService = new GutenbergService();

/**
 * Search Project Gutenberg by title/author
 * @param {Object} params - The search parameters
 * @param {string} params.query - Search query
 * @returns {Promise<Object>} - Search results
 */
export async function searchGutenberg(params) {
	return await gutenbergService.searchBooks(params);
}

/**
 * Get book details from Project Gutenberg
 * @param {Object} params - The parameters for getting book info
 * @param {number|string} params.id_or_title - Book ID or title to look up
 * @returns {Promise<Object>} - Book details
 */
export async function getGutenbergInfo(params) {
	return await gutenbergService.getBookInfo(params);
}

/**
 * Download book from Project Gutenberg
 * @param {Object} params - The parameters for downloading
 * @param {number|string} params.id_or_title - Book ID or title to download
 * @param {string} params.file - Filename to save as (optional)
 * @returns {Promise<Object>} - Download result
 */
export async function downloadGutenberg(params) {
	return await gutenbergService.downloadBook(params);
}
