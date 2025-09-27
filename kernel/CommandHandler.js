import { handlers } from '../contract/index.js';

export class CommandHandler {
	constructor() {
		this.handlers = handlers;
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
			switch (command.name) {
			case 'help':
				result = await this.handlers.help.handleHelp(command.args);
				break;
			case 'train':
				result = await this.handlers.train.handleTrain(command.args);
				break;
			case 'generate':
				if (!command.args.modelName) {
					result = {
						error: 'Error: no model selected',
						output: null,
					};
				} else {
					result = await this.handlers.generate.handleGenerate(command.args);
				}
				break;
			case 'listModels':
				result = await this.handlers.listModels.handleListModels();
				break;
			case 'listCorpus':
				result = await this.handlers.listCorpus.handleListCorpus();
				break;
			case 'delete':
				result = await this.handlers.delete.handleDelete(command.args);
				break;
			case 'use':
				result = await this.handlers.use.handleUse(command.args);
				break;
			case 'pgb_search':
				result = await this.handlers.pgb_search.handleSearch(command.args);
				break;
			case 'pgb_info':
				result = await this.handlers.pgb_info.handleInfo(command.args);
				break;
			case 'pgb_download':
				result = await this.handlers.pgb_download.handleDownload(command.args);
				break;
			case 'exit':
				result = await this.handlers.exit.handleExit(command.args);
				break;
			default:
				result = {
					error: `Unknown command: ${command.name}`,
					output: null,
				};
				break;
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
