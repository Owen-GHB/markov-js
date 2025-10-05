import { CommandProcessor } from '../../processor/CommandProcessor.js';

export class JSONAPI {
	constructor(paths) {
		if (!paths || typeof paths !== 'object' || !paths.contextFilePath) {
			throw new Error('JSONAPI requires a paths object with contextFilePath property');
		}
		this.processor = new CommandProcessor(paths);
	}

	/**
	 * Handle a JSON string input
	 * @param {string} input - The JSON string
	 * @returns {Promise<Object>} - The result of the command
	 */
	async handleInput(input) {
		try {
			// Use the unified CommandProcessor to handle the input
			return await this.processor.processCommand(input);
		} catch (error) {
			return { error: error.message, output: null };
		}
	}
}