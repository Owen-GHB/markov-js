import { FileHandler } from '../io/FileHandler.js';

/**
 * List available corpus files
 * @returns {Promise<Object>} - The list of corpus files
 */
export async function listCorpusFiles() {
  try {
    const fileHandler = new FileHandler();
    const files = await fileHandler.listCorpusFiles();
    
    if (files.length === 0) {
      return { error: null, output: 'No corpus files found in corpus directory' };
    }

    const output = [
      '📚 Available Corpus Files:',
      '--------------------------',
      ...files.map(file => `• ${file}`),
      `\nTotal: ${files.length} file(s)`,
    ];

    return { error: null, output: output.join('\n') };
  } catch (error) {
    return { error: `Failed to list corpus files: ${error.message}`, output: null };
  }
}