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
			switch (command.name) {
			case 'help':
				const helpHandler = await getHandler('help');
				result = await helpHandler.handleHelp(command.args);
				break;
			case 'train':
				const trainHandler = await getHandler('train');
				result = await trainHandler.handleTrain(command.args);
				break;
			case 'generate':
				if (!command.args.modelName) {
					result = {
						error: 'Error: no model selected',
						output: null,
					};
				} else {
					const generateHandler = await getHandler('generate');
					result = await generateHandler.handleGenerate(command.args);
				}
				break;
			case 'listModels':
				const listModelsHandler = await getHandler('listModels');
				result = await listModelsHandler.handleListModels();
				break;
			case 'listCorpus':
				const listCorpusHandler = await getHandler('listCorpus');
				result = await listCorpusHandler.handleListCorpus();
				break;
			case 'delete':
				const deleteHandler = await getHandler('delete');
				result = await deleteHandler.handleDelete(command.args);
				break;
			case 'use':
				const useHandler = await getHandler('use');
				result = await useHandler.handleUse(command.args);
				break;
			case 'pgb_search':
				const pgbSearchHandler = await getHandler('pgb_search');
				result = await pgbSearchHandler.handleSearch(command.args);
				break;
			case 'pgb_info':
				const pgbInfoHandler = await getHandler('pgb_info');
				result = await pgbInfoHandler.handleInfo(command.args);
				break;
			case 'pgb_download':
				const pgbDownloadHandler = await getHandler('pgb_download');
				result = await pgbDownloadHandler.handleDownload(command.args);
				break;
			case 'exit':
				const exitHandler = await getHandler('exit');
				result = await exitHandler.handleExit(command.args);
				break;
			default:
				result = {
					error: `Unknown command: ${command.name}`,
					output: null,
				};
				break;
			}
		} catch (error) {
			result = {
				error: `Error processing command: ${error.message}`,
				output: null,
			};
			return result;
		}
		return result;
	}

	}
