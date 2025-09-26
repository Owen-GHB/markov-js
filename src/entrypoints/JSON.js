import { CommandHandler } from '../interpreter/CommandHandler.js';

export class JSONAPI {
	constructor() {
		this.app = new CommandHandler();
	}

	/**
	 * Handle a JSON string input
	 * @param {string} input - The JSON string
	 * @returns {Promise<Object>} - The result of the command
	 */
	async handleInput(input) {
		try {
			let command = JSON.parse(input);
			return await this.app.handleCommand(command);
		} catch (error) {
			return { error: error.message, output: null };
		}
	}
}
