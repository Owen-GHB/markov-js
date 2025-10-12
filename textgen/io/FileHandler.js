import fs from 'fs/promises';
import path from 'path';

/**
 * File I/O operations for text files and data
 * Handles reading corpus files and managing file paths
 */
export class FileHandler {
	constructor(options = {}) {
		this.defaultCorpusDir = options.corpusDir || './data/corpus';
		this.defaultModelDir = options.modelDir || './data/models';
		this.encoding = options.encoding || 'utf8';
	}

	/**
	 * Read a text file with automatic path resolution
	 * @param {string} filename - File name or path
	 * @returns {Promise<string>} - File contents
	 */
	async readTextFile(filename) {
		const fullPath = this.resolveCorpusPath(filename);

		try {
			await fs.access(fullPath, fs.constants.R_OK);
		} catch (error) {
			if (error.code === 'ENOENT') {
				throw new Error(`File not found: ${fullPath}`);
			} else if (error.code === 'EACCES') {
				throw new Error(`Permission denied to read file: ${fullPath}`);
			}
			throw new Error(`Cannot access file ${filename}: ${error.message}`);
		}

		try {
			const stats = await fs.stat(fullPath);
			if (!stats.isFile()) {
				throw new Error(`${fullPath} is not a file`);
			}

			const content = await fs.readFile(fullPath, this.encoding);

			if (!content.trim()) {
				throw new Error(
					`File ${filename} is empty or contains only whitespace`,
				);
			}

			return content;
		} catch (error) {
			throw new Error(`Failed to read file ${filename}: ${error.message}`);
		}
	}

	/**
	 * Resolve corpus file path.
	 * @param {string} filename - File name or path.
	 * @returns {string} - Full resolved path.
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
	 * Resolve model file path.
	 * @param {string} filename - File name or path.
	 * @returns {string} - Full resolved path.
	 */
	resolveModelPath(filename) {
		if (!filename) {
			throw new Error('Filename cannot be empty');
		}

		if (path.isAbsolute(filename)) {
			return filename;
		}

		// Handle relative paths
		const baseDir = this.defaultModelDir || './data/models';
		return path.join(baseDir, filename);
	}

	/**
	 * Ensure directory exists, create if needed.
	 * @param {string} dirPath - Directory path.
	 */
	async ensureDirectoryExists(dirPath) {
		if (!dirPath || typeof dirPath !== 'string') {
			throw new Error(`Invalid directory path: ${dirPath}`);
		}

		const absolutePath = path.resolve(dirPath);
		try {
			await fs.mkdir(absolutePath, { recursive: true });
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
	 * Format file size in human-readable format.
	 * @param {number} bytes - File size in bytes.
	 * @returns {string} - Formatted size.
	 */
	formatFileSize(bytes) {
		const units = ['B', 'KB', 'MB', 'GB'];
		let size = bytes;
		let unitIndex = 0;

		while (size >= 1024 && unitIndex < units.length - 1) {
			size /= 1024;
			unitIndex++;
		}

		return `${size.toFixed(1)} ${units[unitIndex]}`;
	}
}
