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

// Sources module exports
export * from './gutenberg.js';
