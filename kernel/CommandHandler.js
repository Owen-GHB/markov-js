import { getHandler, manifest as contractManifest } from './contract.js';

export class CommandHandler {
	constructor() {
		// Initialize with the manifest
		this.manifest = contractManifest;
	}

	/**
	 * Handle a parsed command
	 * @param {Object} command - The command object
	 * @returns {Promise<Object>} - The result of the command
	 */
	async handleCommand(command) {
		if (!command) return;
		let result;
		try {
			// Get the handler function for this command dynamically from the contract
			const handlerFunction = await getHandler(command.name);
			
			if (handlerFunction && typeof handlerFunction === 'function') {
				// Call the handler function directly with the command arguments
				result = await handlerFunction(command.args);
			} else if (handlerFunction) {
				result = {
					error: `Handler for command '${command.name}' is not a function`,
					output: null,
				};
			} else {
				result = {
					error: `Unknown command: ${command.name}`,
					output: null,
				};
			}
			return result;
		} catch (error) {
			result = {
				error: `Error processing command: ${error.message}`,
				output: null,
			};
			return result;
		}
	}
}
