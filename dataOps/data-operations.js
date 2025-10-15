import fs from 'fs/promises';
import path from 'path';

const MODELS_DIR = './data/models';
const CORPUS_DIR = './data/corpus';

/**
 * Generic file listing helper
 */
async function listFiles({ directory, extensions, title, emoji, includeStats = false }) {
    try {
        const files = await fs.readdir(directory);
        const filteredFiles = files.filter((file) => 
            extensions.some(ext => file.endsWith(ext))
        );

        if (filteredFiles.length === 0) {
            return `No files found in ${directory}`;
        }

        let fileInfo;
        if (includeStats) {
            fileInfo = await Promise.all(
                filteredFiles.map(async (file) => {
                    const fullPath = path.join(directory, file);
                    const stats = await fs.stat(fullPath);
                    return {
                        filename: file,
                        size: formatFileSize(stats.size),
                        modified: stats.mtime,
                    };
                })
            );
            fileInfo.sort((a, b) => b.modified - a.modified);
        } else {
            fileInfo = filteredFiles.map(filename => ({ filename }));
        }

        const output = [
            `${emoji} ${title}:`,
            '-'.repeat(title.length + 3), // Dynamic separator line
            ...fileInfo.map((info) => 
                includeStats 
                    ? `• ${info.filename} (${info.size})`
                    : `• ${info.filename}`
            ),
            `\nTotal: ${filteredFiles.length} file(s)`,
        ];

        return output.join('\n');
    } catch (error) {
        if (error.code === 'ENOENT') {
            return `No files found - ${directory} does not exist`;
        }
        throw new Error(`Failed to list files: ${error.message}`);
    }
}

/**
 * List available saved models (just JSON files, no parsing)
 * @returns {Promise<Object>} - The list of models
 */
export async function listAvailableModels() {
    return listFiles({
        directory: MODELS_DIR,
        extensions: ['.json'],
        title: 'Saved Models',
        emoji: '📁',
        includeStats: true
    });
}

/**
 * List available corpus files
 * @returns {Promise<Object>} - The list of corpus files
 */
export async function listCorpusFiles() {
    return listFiles({
        directory: CORPUS_DIR,
        extensions: ['.txt', '.md', '.csv'],
        title: 'Available Corpus Files',
        emoji: '📚',
        includeStats: false
    });
}

/**
 * Delete a saved model file
 * @param {Object} params - The parameters for deletion
 * @param {string} params.modelName - Model filename to delete
 * @returns {Promise<Object>} - The result of the deletion
 */
export async function deleteModelFile(modelName) {
    if (!modelName) {
        throw new Error('Model name is required');
    }

    // Full path resolution with security checks
    if (modelName.includes('../') || modelName.includes('..\\')) {
        throw new Error('Invalid path');
    }

    const fullPath = path.join(MODELS_DIR, modelName);

    // Actual deletion
    try {
        await fs.unlink(fullPath);
        return `✅ Successfully deleted model: ${modelName}`;
    } catch (error) {
        if (error.code === 'ENOENT') {
            throw new Error(`Model file not found: ${modelName}`);
        }
        throw new Error(`Failed to delete model: ${error.message}`);
    }
}

/**
 * Format file size in human-readable format
 */
function formatFileSize(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
}

/**
 * Upload a text file to the corpus directory
 * @param {Object} params - The parameters for file upload
 * @param {Object} params.file - The file blob object
 * @param {string} params.filename - Optional custom filename
 * @returns {Promise<Object>} - The result of the upload
 */
export async function uploadCorpusFile(file, filename) {
    console.log('Uploading file:', filename || (file && file.name));
    console.log('File object:', file);
    if (!file) {
        throw new Error('File is required');
    }

    // Ensure corpus directory exists
    try {
        await fs.mkdir(CORPUS_DIR, { recursive: true });
    } catch (error) {
        throw new Error(`Failed to create corpus directory: ${error.message}`);
    }

    // Determine filename
    const finalFilename = filename || file.name || `upload_${Date.now()}.txt`;
    
    // Ensure .txt extension
    const safeFilename = finalFilename.endsWith('.txt') 
        ? finalFilename 
        : `${finalFilename.replace(/\.[^/.]+$/, "")}.txt`;

    // Security check
    if (safeFilename.includes('../') || safeFilename.includes('..\\')) {
        throw new Error('Invalid filename');
    }

    const fullPath = path.join(CORPUS_DIR, safeFilename);

    try {
        // Check if file already exists
        try {
            await fs.access(fullPath);
            throw new Error(`File already exists: ${safeFilename}. Use a different filename.`);
        } catch (error) {
            // File doesn't exist, which is what we want
            if (error.code !== 'ENOENT') throw error;
        }
        // Write the file data
        await fs.writeFile(fullPath, file.data);
        
        // Verify the file was written
        const stats = await fs.stat(fullPath);
        
        return `✅ Successfully uploaded: ${safeFilename} (${formatFileSize(stats.size)})`;
    } catch (error) {
        if (error.message.includes('already exists')) {
            throw error;
        }
        throw new Error(`Failed to upload file: ${error.message}`);
    }
}