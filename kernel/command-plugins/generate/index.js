// File: generate/index.js

import { UI } from './UI.js';
import path from 'path';
import { pathToFileURL } from 'url';

// Plugin instance (singleton)
let generatorInstance = null;

function getGeneratorInstance() {
    if (!generatorInstance) {
        generatorInstance = new UI();
    }
    return generatorInstance;
}

/**
 * Run the EJS-based generator plugin
 * @param {string} userTemplateDir - Directory for user templates
 * @param {string} generatedUIDir - Directory for generated UI output
 * @param {string} kernelPath - Path to kernel directory
 * @param {string} projectRoot - Project root directory (defaults to cwd)
 * @returns {Promise<void>}
 */
export async function run(kernelPath, commandRoot, projectRoot, userTemplateDir, generatedUIDir) {
    const manifestUrl = pathToFileURL(path.join(kernelPath, 'contract.js')).href;
	const { manifestReader } = await import(manifestUrl);
	const manifest = manifestReader(projectRoot);
    
    const generator = getGeneratorInstance();
    return await generator.run(userTemplateDir, generatedUIDir, manifest);
}

export default {
    run,
};