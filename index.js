import { generateText, trainModel } from './textgen/index.js';
import { deleteModelFile, listAvailableModels, listCorpusFiles } from './dataOps/index.js';
import { downloadGutenberg, getGutenbergInfo, searchGutenberg } from './gutendex/index.js';

// Export all functions from the submodules
export {
    generateText,
    trainModel,
    deleteModelFile,
    listAvailableModels,
    listCorpusFiles,
    downloadGutenberg,
    getGutenbergInfo,
    searchGutenberg,
};