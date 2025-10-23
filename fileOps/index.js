import fs from 'fs/promises';
import path from 'path';

/**
 * Read and parse a JSON file from the filesystem
 * @param {Object} params - The parameters
 * @param {string} params.path - Path to JSON file
 * @returns {Promise<Object>} - Parsed JSON data
 */
export async function returnObjectFromJSONFile(params) {
    const { path: filePath } = params;
    
    if (!filePath) {
        throw new Error('Path parameter is required');
    }

    // Resolve relative to project root (cwd)
    const absolutePath = path.resolve(process.cwd(), filePath);
    
    try {
        const data = await fs.readFile(absolutePath, 'utf8');
        const parsed = JSON.parse(data);
        
        return {
            success: true,
            data: parsed,
            filePath: absolutePath,
            size: data.length
        };
    } catch (error) {
        if (error.code === 'ENOENT') {
            throw new Error(`File not found: ${filePath}`);
        }
        if (error instanceof SyntaxError) {
            throw new Error(`Invalid JSON in file: ${filePath}`);
        }
        throw new Error(`Failed to read file: ${error.message}`);
    }
}

/**
 * Save buffer data to corpus directory
 * @param {Object} params - The parameters
 * @param {Buffer} params.buffer - Buffer data to save
 * @param {string} params.filename - Target filename
 * @returns {Promise<Object>} - Save result
 */
export async function saveBufferToCorpus(params) {
    const { buffer, filename } = params;
    
    if (!buffer) {
        throw new Error('Buffer parameter is required');
    }
    if (!filename) {
        throw new Error('Filename parameter is required');
    }

    // Handle string input (CLI testing)
    let finalBuffer;
    if (typeof buffer === 'string') {
        finalBuffer = Buffer.from(buffer, 'utf8');
    } else if (Buffer.isBuffer(buffer)) {
        finalBuffer = buffer;
    } else if (buffer.data && Array.isArray(buffer.data)) {
        // Handle array data from command chain
        finalBuffer = Buffer.from(buffer.data);
    } else {
        throw new Error('Invalid buffer format');
    }

    const corpusDir = './data/corpus';
    const safeFilename = filename.endsWith('.txt') ? filename : `${filename}.txt`;
    const fullPath = path.resolve(process.cwd(), corpusDir, safeFilename);

    try {
        // Ensure directory exists
        await fs.mkdir(corpusDir, { recursive: true });
        
        // Write file
        await fs.writeFile(fullPath, finalBuffer);
        const stats = await fs.stat(fullPath);
        
        return {
            success: true,
            filename: safeFilename,
            path: fullPath,
            size: stats.size,
            bytesWritten: finalBuffer.length
        };
    } catch (error) {
        throw new Error(`Failed to save file: ${error.message}`);
    }
}

/**
 * Read text content from a file
 * @param {Object} params - The parameters
 * @param {string} params.path - Path to text file
 * @returns {Promise<Object>} - File content and metadata
 */
export async function returnTextFromFile(params) {
    const { path: filePath } = params;
    
    if (!filePath) {
        throw new Error('Path parameter is required');
    }

    // Resolve relative to project root (cwd)
    const absolutePath = path.resolve(process.cwd(), filePath);
    
    try {
        const data = await fs.readFile(absolutePath, 'utf8');
        
        return {
            success: true,
            data: data,  // The actual text content
            filePath: absolutePath,
            size: data.length
        };
    } catch (error) {
        if (error.code === 'ENOENT') {
            throw new Error(`File not found: ${filePath}`);
        }
        throw new Error(`Failed to read file: ${error.message}`);
    }
}

/**
 * Save model data to models directory as JSON
 * @param {Object} params - The parameters
 * @param {Object} params.data - Model data object to save
 * @param {string} params.filename - Target filename
 * @returns {Promise<Object>} - Save result
 */
export async function saveObjectToModels(params) {
    const { data, filename } = params;

    const modelsDir = './data/models';
    const safeFilename = filename.endsWith('.json') ? filename : `${filename}.json`;
    const fullPath = path.resolve(process.cwd(), modelsDir, safeFilename);

    try {
        // Ensure directory exists
        await fs.mkdir(modelsDir, { recursive: true });
        
        // Convert to JSON and write file
        const jsonString = JSON.stringify(data, null, 2);
        await fs.writeFile(fullPath, jsonString, 'utf8');
        const stats = await fs.stat(fullPath);
        
        return {
            success: true,
            filename: safeFilename,
            path: fullPath,
            size: stats.size,
            bytesWritten: jsonString.length
        };
    } catch (error) {
        throw new Error(`Failed to save model: ${error.message}`);
    }
}