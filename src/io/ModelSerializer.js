import path from 'path';
import fs from 'fs/promises';
import { MarkovModel } from '../core/MarkovModel.js';
import { FileHandler } from './FileHandler.js';

/**
 * Handle saving and loading Markov models
 * Supports JSON format with compression and metadata
 */
export class ModelSerializer {
    constructor(options = {}) {
        this.fileHandler = new FileHandler(options);
        this.compression = options.compression || false;
        this.includeMetadata = options.includeMetadata !== false;
    }

    /**
     * Save a Markov model to file
     * @param {MarkovModel} model - Model to save
     * @param {string} filename - Output filename
     * @param {Object} options - Save options
     */
    async saveModel(model, filename, options = {}) {
        if (!model || !(model instanceof MarkovModel)) {
            throw new Error('Invalid model provided');
        }

        if (!filename) {
            throw new Error('Filename is required');
        }

        const fullPath = this.fileHandler.resolveModelPath(filename);
        const dirPath = path.dirname(fullPath);
        
        await this.fileHandler.ensureDirectoryExists(dirPath);

        const modelData = {
            // Core model data
            ...model.toJSON(),
            
            // Metadata (if enabled)
            ...(this.includeMetadata && {
                metadata: {
                    version: '1.0',
                    created: new Date().toISOString(),
                    nodeVersion: process.version,
                    generator: 'markov-text-generator'
                }
            })
        };

        try {
            const jsonString = JSON.stringify(modelData, null, options.pretty ? 2 : 0);
            await fs.writeFile(fullPath, jsonString, 'utf8');
            
            // Get file stats for confirmation
            const stats = await fs.stat(fullPath);
            console.log(`Model saved: ${this.fileHandler.formatFileSize(stats.size)}`);
            
        } catch (error) {
            throw new Error(`Failed to save model to ${filename}: ${error.message}`);
        }
    }

    /**
     * Load a Markov model from file
     * @param {string} filename - Model filename
     * @returns {Promise<MarkovModel>} - Loaded model
     */
    async loadModel(filename) {
        const fullPath = this.fileHandler.resolveModelPath(filename);
        
        try {
            const jsonString = await fs.readFile(fullPath, 'utf8');
            const modelData = JSON.parse(jsonString);
            
            // Validate model data structure
            this.validateModelData(modelData);
            
            // Create new model and load data
            const model = new MarkovModel(modelData.order);
            model.fromJSON(modelData);
            
            // Log metadata if available
            if (modelData.metadata) {
                console.log(`Loaded model created: ${modelData.metadata.created}`);
            }
            
            return model;
            
        } catch (error) {
            if (error.code === 'ENOENT') {
                throw new Error(`Model file not found: ${fullPath}`);
            }
            if (error instanceof SyntaxError) {
                throw new Error(`Invalid JSON in model file: ${filename}`);
            }
            throw new Error(`Failed to load model from ${filename}: ${error.message}`);
        }
    }

    /**
     * Validate model data structure
     * @param {Object} modelData - Model data to validate
     */
    validateModelData(modelData) {
        if (!modelData || typeof modelData !== 'object') {
            throw new Error('Invalid model data: not an object');
        }
        
        if (typeof modelData.order !== 'number' || modelData.order < 1) {
            throw new Error('Invalid model data: missing or invalid order');
        }
        
        if (!modelData.chains || typeof modelData.chains !== 'object') {
            throw new Error('Invalid model data: missing or invalid chains');
        }
        
        if (!Array.isArray(modelData.vocabulary)) {
            throw new Error('Invalid model data: missing or invalid vocabulary');
        }
    }

    /**
     * List available saved models
     * @returns {Promise<Array>} - Array of model info objects
     */
    async listModels() {
        try {
            const modelDir = this.fileHandler.defaultModelDir;
            const files = await fs.readdir(modelDir);
            const modelFiles = files.filter(file => file.endsWith('.json'));
            
            const modelInfo = await Promise.all(
                modelFiles.map(async (file) => {
                    const fullPath = `${modelDir}/${file}`;
                    const stats = await fs.stat(fullPath);
                    
                    // Try to read basic model info without full loading
                    try {
                        const content = await fs.readFile(fullPath, 'utf8');
                        const data = JSON.parse(content);
                        
                        return {
                            filename: file,
                            path: fullPath,
                            size: this.fileHandler.formatFileSize(stats.size),
                            modified: stats.mtime,
                            order: data.order,
                            states: data.chains ? Object.keys(data.chains).length : 0,
                            vocabulary: data.vocabulary ? data.vocabulary.length : 0,
                            created: data.metadata?.created || null
                        };
                    } catch (error) {
                        return {
                            filename: file,
                            path: fullPath,
                            size: this.fileHandler.formatFileSize(stats.size),
                            modified: stats.mtime,
                            error: 'Could not parse model file'
                        };
                    }
                })
            );
            
            return modelInfo.sort((a, b) => b.modified - a.modified);
            
        } catch (error) {
            if (error.code === 'ENOENT') {
                // Directory doesn't exist yet, return empty array
                return [];
            }
            throw new Error(`Failed to list models: ${error.message}`);
        }
    }

    /**
     * Delete a saved model file
     * @param {string} filename - Model filename to delete
     * @returns {Promise<boolean>} - True if deletion was successful
     */
    async deleteModel(filename) {
        const fullPath = this.fileHandler.resolveModelPath(filename);
        
        try {
            await fs.unlink(fullPath);
            return true;
        } catch (error) {
            if (error.code === 'ENOENT') {
                throw new Error(`Model file not found: ${filename}`);
            }
            throw new Error(`Failed to delete model: ${error.message}`);
        }
    }

    /**
     * Check if a model file exists
     * @param {string} filename - Model filename to check
     * @returns {Promise<boolean>} - True if file exists
     */
    async modelExists(filename) {
        const fullPath = this.fileHandler.resolveModelPath(filename);
        
        try {
            await fs.access(fullPath);
            return true;
        } catch (error) {
            if (error.code === 'ENOENT') {
                return false;
            }
            throw new Error(`Error checking model existence: ${error.message}`);
        }
    }
}