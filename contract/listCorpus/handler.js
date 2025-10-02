import { listCorpusFiles } from '../../textgen/index.js';

/**
 * Handle the "listCorpus" command
 * @returns {Promise<Object>} - The list of corpus files
 */
export default async function handleListCorpus() {
	return await listCorpusFiles();
}
