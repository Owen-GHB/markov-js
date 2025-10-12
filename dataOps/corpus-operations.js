import { FileHandler } from '../textgen/io/FileHandler.js';

/**
 * List available corpus files
 * @returns {Promise<Object>} - The list of corpus files
 */
export async function listCorpusFiles() {
	const fileHandler = new FileHandler();
	const files = await fileHandler.listCorpusFiles();

	if (files.length === 0) {
		return 'No corpus files found in corpus directory';
	}

	const output = [
		'📚 Available Corpus Files:',
		'--------------------------',
		...files.map((file) => `• ${file}`),
		`\nTotal: ${files.length} file(s)`,
	];

	return output.join('\n');
}
