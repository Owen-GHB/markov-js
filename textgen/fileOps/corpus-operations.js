import { FileHandler } from '../io/FileHandler.js';

/**
 * List available corpus files
 * @returns {Promise<Object>} - Corpus list object
 */
export async function listCorpusFiles() {
	const fileHandler = new FileHandler();
	const files = await fileHandler.listCorpusFiles();

	if (files.length === 0) {
		return { type: 'message', content: 'No corpus files found in corpus directory', count: 0 };
	}

	return {
		type: 'corpus_list',
		count: files.length,
		files: files
	};
}
