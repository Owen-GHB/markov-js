import { getJSON, downloadFile } from './GutendexAPI.js';
import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';

/**
 * Service class for Project Gutenberg operations
 */
export class GutenbergService {
	constructor() {
		this.API_BASE = 'https://gutendex.com';
		this.defaultCorpusDir = './data/corpus';
	}

	/**
	 * Search for books on Project Gutenberg
	 * @param {Object} params - Search parameters
	 * @param {string} params.query - Search query
	 * @returns {Promise<string>} - Formatted search results
	 */
	async searchBooks(params) {
		const { query } = params;
		if (!query) {
			throw new Error('Please specify a search term');
		}

		try {
			const url = `${this.API_BASE}/books/?search=${encodeURIComponent(query)}`;
			const data = await getJSON(url);

			if (!data.results || data.results.length === 0) {
				throw new Error('No books found matching your search');
			}

			const output = [
				'📚 Search Results:',
				'──────────────────',
				`Displaying ${Math.min(data.results.length, 32)} of ${data.count} matching books`,
				'',
				...data.results.map(
					(book) =>
						`• ID: ${book.id} - "${book.title}"` +
						(book.authors.length ? ` by ${book.authors[0].name}` : ''),
				),
				'',
				data.next ? '(More results available)' : '',
			];

			return output.join('\n');
		} catch (error) {
			throw new Error(`Search failed: ${error.message}`);
		}
	}

	/**
	 * Get detailed information about a book
	 * @param {Object} params - Book parameters
	 * @param {number|string} params.id_or_title - Book ID or title
	 * @returns {Promise<string>} - Formatted book information
	 */
	async getBookInfo(params) {
		const { id_or_title } = params;
		let id = null;
		let title = null;

		if (typeof id_or_title === 'number' || /^\d+$/.test(id_or_title)) {
			id = Number(id_or_title);
		} else if (typeof id_or_title === 'string') {
			title = id_or_title.trim();
		}

		if (!id && !title) {
			throw new Error('Please specify either an ID or title');
		}

		try {
			let book;
			if (id) {
				// Direct ID lookup
				const bookData = await getJSON(`${this.API_BASE}/books/${id}`);
				if (!bookData || bookData.detail === 'Not found') {
					throw new Error(`No book found with ID "${id}"`);
				}
				book = bookData;
			} else {
				// Title search fallback
				const searchResults = await getJSON(
					`${this.API_BASE}/books/?search=${encodeURIComponent(title)}`,
				);
				if (!searchResults.results || searchResults.results.length === 0) {
					throw new Error(`No book found with title "${title}"`);
				}
				book = searchResults.results[0];
			}

			// Format the book information
			const output = [
				'📖 Book Information',
				'──────────────────',
				`ID: ${book.id}`,
				`Title: ${book.title}`,
				`Authors: ${book.authors.map((a) => a.name).join(', ') || 'Unknown'}`,
				`Subjects: ${book.subjects?.join(', ') || 'None listed'}`,
				`Languages: ${book.languages?.join(', ') || 'Unknown'}`,
				`Download Count: ${book.download_count || 0}`,
				`Bookshelves: ${book.bookshelves?.join(', ') || 'None'}`,
				`Formats Available: ${Object.keys(book.formats).join(', ')}`,
			];

			return output.join('\n');
		} catch (error) {
			throw new Error(`Failed to get book info: ${error.message}`);
		}
	}



	/**
	 * Download a book from Project Gutenberg
	 * @param {Object} params - Download parameters
	 * @param {number|string} params.id_or_title - Book ID or title
	 * @param {string} params.file - Target filename (optional)
	 * @returns {Promise<string>} - Download confirmation message
	 */
	async downloadBook(params) {
		const { id_or_title, file } = params;
		let id = null;
		let title = null;

		if (typeof id_or_title === 'number' || /^\d+$/.test(id_or_title)) {
			id = Number(id_or_title);
		} else if (typeof id_or_title === 'string') {
			title = id_or_title.trim();
		}

		if (!id && !title) {
			throw new Error('Please specify either an ID or title');
		}

		try {
			// Inlined ensureDirectoryExists functionality
			await this.ensureDirectoryExists(this.defaultCorpusDir);

			let book;
			if (id) {
				book = await getJSON(`${this.API_BASE}/books/${id}`);
				if (!book || book.detail === 'Not found') {
					throw new Error(`No book found with ID "${id}"`);
				}
			} else {
				const searchResults = await getJSON(
					`${this.API_BASE}/books/?search=${encodeURIComponent(title)}`,
				);
				if (!searchResults.results?.length) {
					throw new Error(`No book found with title "${title}"`);
				}
				book = searchResults.results[0];
			}

			let filename;
			if (file && file != 'null') {
				filename = file;
			} else if (id) {
				filename = `${id}.txt`;
			} else {
				// Sanitize title for filename
				const sanitizedTitle = book.title
					.toLowerCase()
					.replace(/[^a-z0-9]/g, '_')
					.replace(/_+/g, '_')
					.substring(0, 50); // Limit length
				filename = `${sanitizedTitle}.txt`;
			}

			const txtUrl = this.findTextFormat(book.formats);
			if (!txtUrl) {
				throw new Error('No plain text format available');
			}

			// Inlined resolveCorpusPath functionality
			const corpusPath = this.resolveCorpusPath(filename);

			await downloadFile(txtUrl, corpusPath);
			await this.cleanGutenbergText(corpusPath);

			return `✅ Successfully downloaded "${book.title}" to ${filename}`;
		} catch (error) {
			throw new Error(`Download failed: ${error.message}`);
		}
	}

	/**
	 * Ensure directory exists, create if needed (inlined from FileHandler)
	 * @param {string} dirPath - Directory path
	 */
	async ensureDirectoryExists(dirPath) {
		if (!dirPath || typeof dirPath !== 'string') {
			throw new Error(`Invalid directory path: ${dirPath}`);
		}

		const absolutePath = path.resolve(dirPath);
		try {
			// Use fs.promises.mkdir for promise-based API
			await fs.promises.mkdir(absolutePath, { recursive: true });
		} catch (error) {
			if (error.code !== 'EEXIST') {
				// Ignore if directory already exists
				throw new Error(
					`Failed to create directory ${absolutePath}: ${error.message}`,
				);
			}
		}
	}

	/**
	 * Resolve corpus file path (inlined from FileHandler)
	 * @param {string} filename - File name or path
	 * @returns {string} - Full resolved path
	 */
	resolveCorpusPath(filename) {
		if (!filename || typeof filename !== 'string') {
			throw new Error('Invalid filename');
		}

		// Prevent directory traversal
		if (filename.includes('../') || filename.includes('..\\')) {
			throw new Error('Invalid path');
		}

		if (path.isAbsolute(filename)) {
			return filename;
		}

		// Try relative to current directory first
		if (filename.includes('/') || filename.includes('\\')) {
			return path.resolve(filename);
		}

		// Default to corpus directory
		return path.join(this.defaultCorpusDir, filename);
	}

	/**
	 * Find the text format URL from available formats
	 * @param {Object} formats - Available book formats
	 * @returns {string|null} - Text format URL or null
	 */
	findTextFormat(formats) {
		const txtEntry =
			Object.entries(formats).find(([_, url]) => url.endsWith('.utf-8')) ||
			Object.entries(formats).find(([key]) => key.startsWith('text/plain'));
		return txtEntry?.[1];
	}

	/**
	 * Clean Gutenberg text by removing license headers/footers
	 * @param {string} filepath - Path to the file to clean
	 */
	async cleanGutenbergText(filepath) {
		try {
			let text = await fs.promises.readFile(filepath, 'utf8');
			const startMarker = '*** START OF THE PROJECT GUTENBERG EBOOK';
			const endMarker = '*** END OF THE PROJECT GUTENBERG EBOOK';

			const startIndex = text.indexOf(startMarker);
			const endIndex = text.indexOf(endMarker);

			if (startIndex !== -1 && endIndex !== -1) {
				const afterStart = text.indexOf('\n', startIndex) + 1;
				text = text.slice(afterStart, endIndex).trim();
				await fs.promises.writeFile(filepath, text, 'utf8');
			}
		} catch (error) {
			console.warn('Error cleaning text:', error.message);
		}
	}

	/**
	 * Download a book from Project Gutenberg and return as buffer
	 */
	async downloadBookBuffer(params) {
	const { id_or_title } = params;
	let id = null;
	let title = null;

	if (typeof id_or_title === 'number' || /^\d+$/.test(id_or_title)) {
		id = Number(id_or_title);
	} else if (typeof id_or_title === 'string') {
		title = id_or_title.trim();
	}

	if (!id && !title) {
		throw new Error('Please specify either an ID or title');
	}

	try {
		let book;
		if (id) {
		book = await getJSON(`${this.API_BASE}/books/${id}`);
		if (!book || book.detail === 'Not found') {
			throw new Error(`No book found with ID "${id}"`);
		}
		} else {
		const searchResults = await getJSON(
			`${this.API_BASE}/books/?search=${encodeURIComponent(title)}`,
		);
		if (!searchResults.results?.length) {
			throw new Error(`No book found with title "${title}"`);
		}
		book = searchResults.results[0];
		}

		const txtUrl = this.findTextFormat(book.formats);
		if (!txtUrl) {
		throw new Error('No plain text format available');
		}

		// Download to buffer instead of file
		const buffer = await this.downloadToBuffer(txtUrl);
		
		// Clean the text in memory
		const cleanedBuffer = await this.cleanGutenbergBuffer(buffer);
		
		return {
		success: true,
		bookInfo: {
			title: book.title,
			authors: book.authors?.map(a => a.name).join(', ') || 'Unknown',
			id: book.id
		},
		buffer: cleanedBuffer,
		filename: this.generateFilename(book)
		};
	} catch (error) {
		throw new Error(`Download failed: ${error.message}`);
	}
	}

	/**
	 * Download URL content to buffer
	 */
	async downloadToBuffer(url) {
	return new Promise((resolve, reject) => {
		const getClient = (url) => (url.startsWith('https:') ? https : http);
		
		const doGet = (url, depth = 0) => {
		if (depth > 5) {
			return reject(new Error('Too many redirects'));
		}

		const client = getClient(url);
		const chunks = [];
		
		client.get(url, (res) => {
			if (res.statusCode === 301 || res.statusCode === 302) {
			let location = res.headers.location;
			if (!location) return reject(new Error('Redirect with no location'));
			if (!/^https?:\/\//i.test(location)) {
				const base = new URL(url);
				location = new URL(location, base).href;
			}
			return doGet(location, depth + 1);
			}

			if (res.statusCode !== 200) {
			return reject(new Error(`HTTP ${res.statusCode}`));
			}

			res.on('data', (chunk) => chunks.push(chunk));
			res.on('end', () => resolve(Buffer.concat(chunks)));
		}).on('error', reject);
		};

		doGet(url);
	});
	}

	/**
	 * Clean Gutenberg text in memory
	 */
	async cleanGutenbergBuffer(buffer) {
	try {
		let text = buffer.toString('utf8');
		const startMarker = '*** START OF THE PROJECT GUTENBERG EBOOK';
		const endMarker = '*** END OF THE PROJECT GUTENBERG EBOOK';

		const startIndex = text.indexOf(startMarker);
		const endIndex = text.indexOf(endMarker);

		if (startIndex !== -1 && endIndex !== -1) {
		const afterStart = text.indexOf('\n', startIndex) + 1;
		text = text.slice(afterStart, endIndex).trim();
		}
		
		return Buffer.from(text, 'utf8');
	} catch (error) {
		console.warn('Error cleaning text buffer:', error.message);
		return buffer; // Return original if cleaning fails
	}
	}

	/**
	 * Generate filename from book info
	 */
	generateFilename(book) {
	if (book.id) {
		return `${book.id}.txt`;
	}
	// Sanitize title for filename
	const sanitizedTitle = book.title
		.toLowerCase()
		.replace(/[^a-z0-9]/g, '_')
		.replace(/_+/g, '_')
		.substring(0, 50);
	return `${sanitizedTitle}.txt`;
	}
}
