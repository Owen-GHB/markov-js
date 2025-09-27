import { FileHandler } from '../../textgen/io/FileHandler.js';
import { ModelSerializer } from '../../textgen/io/ModelSerializer.js';

/**
 * Handle the "listCorpus" command
 * @returns {Promise<Object>} - The list of corpus files
 */
export default async function handleListCorpus() {
	try {
		const fileHandler = new FileHandler();
		const corpusFiles = await fileHandler.listCorpusFiles();
		if (corpusFiles.length === 0) {
			return {
				error: null,
				output: 'No corpus files found in corpus directory',
			};
		}

		const output = [
			'📄 Corpus Files:',
			'----------------',
			...corpusFiles.map((file) => `• ${file}`),
			`\nTotal: ${corpusFiles.length} file(s)`,
		];

		return { error: null, output: output.join('\n') };
	} catch (error) {
		return {
			error: `Failed to list corpus files: ${error.message}`,
			output: null,
		};
	}
}
