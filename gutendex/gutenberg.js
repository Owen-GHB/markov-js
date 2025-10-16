import { GutenbergService } from './gutenberg-service.js';

// Create a singleton instance of the service
const gutenbergService = new GutenbergService();

/**
 * Search Project Gutenberg by title/author
 * @param {Object} params - The search parameters
 * @param {string} params.query - Search query
 * @returns {Promise<Object>} - Search results or error
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

/**
 * Download book in HTML format from Project Gutenberg
 * @param {Object} params - The parameters for downloading
 * @param {number|string} params.id_or_title - Book ID or title to download
 * @param {string} params.file - Filename to save as (optional)
 * @returns {Promise<Object>} - Download result
 */
export async function downloadGutenbergHTML(params) {
    return await gutenbergService.downloadBookHTML(params);
}

/**
 * Start HTTP server to serve an ebook
 * @param {Object} params - The parameters for serving
 * @param {string} params.filename - Filename to serve from ebooks directory
 * @param {number} params.port - Port to run server on (optional, default: 3000)
 * @returns {Promise<Object>} - Server start result
 */
export async function serveBook(params) {
    return await gutenbergService.serveBook(params);
}

/**
 * Launch Electron window to display ebook
 * @param {Object} params - The parameters for Electron
 * @param {string} params.filename - HTML filename to display
 * @returns {Promise<Object>} - Launch result
 */
export async function launchElectron(params) {
    return await gutenbergService.launchElectron(params);
}

/**
 * Download book from Project Gutenberg
 * @param {Object} params - The parameters for downloading
 * @param {number|string} params.id_or_title - Book ID or title to download
 * @param {string} params.file - Filename to save as (optional) 
 * @returns {Promise<Object} - Book as data buffer
 */
export async function downloadBookBuffer(params) {
    return await gutenbergService.downloadBookBuffer(params)
}