import { CommandHandler } from '../../CommandHandler.js';
import { CommandParser } from '../../CommandParser.js';

export class JSONAPI {
	constructor() {
		this.app = new CommandHandler();
		this.parser = new CommandParser();
	}

	/**
	 * Handle a JSON string input
	 * @param {string} input - The JSON string
	 * @returns {Promise<Object>} - The result of the command
	 */
	async handleInput(input) {
		try {
			// Use the unified parser which handles both JSON and string formats
			const context = {}; // Empty context
			const { error, command } = this.parser.parse(input, context);
			
			if (error) {
				return { error: error, output: null };
			}
			
			return await this.app.handleCommand(command);
		} catch (error) {
			return { error: error.message, output: null };
		}
	}
}