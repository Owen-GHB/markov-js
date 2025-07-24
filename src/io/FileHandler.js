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
            const stats = await fs.stat(fullPath);
            if (!stats.isFile()) {
                throw new Error(`${fullPath} is not a file`);
            }
            
            const content = await fs.readFile(fullPath, this.encoding);
            
            if (!content.trim()) {
                throw new Error(`File ${filename} is empty`);
            }
            
            return content;
        } catch (error) {
            if (error.code === 'ENOENT') {
                throw new Error(`File not found: ${fullPath}`);
            }
            throw new Error(`Failed to read file ${filename}: ${error.message}`);
        }
    }

    /**
     * Delete a saved model.
     * @param {string} filename - Model filename to delete.
     */
    async deleteModel(filename) {
        const fullPath = this.resolveModelPath(filename);
        
        try {
            await fs.unlink(fullPath);
        } catch (error) {
            if (error.code === 'ENOENT') {
                throw new Error(`Model file not found: ${filename}`);
            }
            throw new Error(`Failed to delete model ${filename}: ${error.message}`);
        }
    }

    /**
     * Get model file information without loading the full model.
     * @param {string} filename - Model filename.
     * @returns {Promise<Object>} - Model metadata and stats.
     */
    async getModelInfo(filename) {
        const fullPath = this.resolveModelPath(filename);
        
        try {
            const stats = await fs.stat(fullPath);
            const content = await fs.readFile(fullPath, 'utf8');
            const data = JSON.parse(content);
            
            return {
                filename,
                path: fullPath,
                size: stats.size,
                sizeFormatted: this.formatFileSize(stats.size),
                modified: stats.mtime,
                order: data.order,
                totalStates: data.chains ? Object.keys(data.chains).length : 0,
                vocabularySize: data.vocabulary ? data.vocabulary.length : 0,
                totalTokens: data.totalTokens || 0,
                startStates: data.startStates ? data.startStates.length : 0,
                metadata: data.metadata || null
            };
            
        } catch (error) {
            if (error.code === 'ENOENT') {
                throw new Error(`Model file not found: ${filename}`);
            }
            if (error instanceof SyntaxError) {
                throw new Error(`Invalid JSON in model file: ${filename}`);
            }
            throw new Error(`Failed to get model info for ${filename}: ${error.message}`);
        }
    }

    /**
     * Write text to file.
     * @param {string} filename - File name or path.
     * @param {string} content - Content to write.
     * @param {Object} options - Write options.
     */
    async writeTextFile(filename, content, options = {}) {
        const fullPath = this.resolveCorpusPath(filename);
        
        // Ensure directory exists
        await this.ensureDirectoryExists(path.dirname(fullPath));
        
        try {
            await fs.writeFile(fullPath, content, {
                encoding: this.encoding,
                ...options
            });
        } catch (error) {
            throw new Error(`Failed to write file ${filename}: ${error.message}`);
        }
    }

    /**
     * List available corpus files.
     * @returns {Promise<string[]>} - Array of corpus file names.
     */
    async listCorpusFiles() {
        try {
            const files = await fs.readdir(this.defaultCorpusDir);
            return files.filter(file => 
                file.endsWith('.txt') || 
                file.endsWith('.md') || 
                file.endsWith('.csv')
            );
        } catch (error) {
            if (error.code === 'ENOENT') {
                return [];
            }
            throw new Error(`Failed to list corpus files: ${error.message}`);
        }
    }

    /**
     * Get file information.
     * @param {string} filename - File name.
     * @returns {Promise<Object>} - File stats and info.
     */
    async getFileInfo(filename) {
        const fullPath = this.resolveCorpusPath(filename);
        
        try {
            const stats = await fs.stat(fullPath);
            const content = await fs.readFile(fullPath, this.encoding);
            
            return {
                path: fullPath,
                size: stats.size,
                sizeFormatted: this.formatFileSize(stats.size),
                modified: stats.mtime,
                characterCount: content.length,
                lineCount: content.split('\n').length,
                wordCount: content.split(/\s+/).filter(word => word.length > 0).length
            };
        } catch (error) {
            throw new Error(`Failed to get file info for ${filename}: ${error.message}`);
        }
    }

    /**
     * Resolve corpus file path.
     * @param {string} filename - File name or path.
     * @returns {string} - Full resolved path.
     */
    resolveCorpusPath(filename) {
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
            if (error.code !== 'EEXIST') { // Ignore if directory already exists
                throw new Error(`Failed to create directory ${absolutePath}: ${error.message}`);
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