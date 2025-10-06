import { CommandProcessor } from '../../processor/CommandProcessor.js';
import { manifest } from '../../contract.js';

export class JSONAPI {
	constructor(config) {
		if (!config || typeof config !== 'object') {
			throw new Error('JSONAPI requires a config object');
		}
		
		// Extract paths from nested config object
		const paths = config.paths || {};
		
		if (!paths.contextFilePath) {
			throw new Error('JSONAPI config requires paths with contextFilePath property');
		}
		this.processor = new CommandProcessor(config, manifest);
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