import { GenerateHandler } from "./handlers/Generate.js";
import { TrainHandler } from "./handlers/Train.js";
import { OperationsHandler } from "./handlers/Operations.js";
import { PGBHandler } from "./handlers/Gutenberg.js";

export class CommandHandler {

    constructor() {
        this.generateHandler = new GenerateHandler();
        this.trainHandler = new TrainHandler();
        this.operationsHandler = new OperationsHandler();
        this.pgbHandler = new PGBHandler();
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
                    result = {
                        error: null,
                        output: this.getHelpText()
                    };
                    break;
                case 'train':
                    result = await this.handleTrain(command.args);
                    break;
                case 'generate':
                    if (!command.args.modelName) {
                        result = {
                            error: 'Error: no model selected',
                            output: null
                        };
                    } else {
                        result = await this.handleGenerate(command.args);
                    }
                    break;
                case 'listmodels':
                    result = await this.handleListModels();
                    break;
                case 'listcorpus':
                    result = await this.handleListCorpus();
                    break;
                case 'delete':
                    result = await this.handleDeleteModel(command.args);
                    break;
                case 'use':
                    if (!command.args.modelName) {
                        result = {
                            error: 'Model name is required (e.g., use("model.json"))',
                            output: null
                        };
                    } else {
                        result = {
                            error: null,
                            output: `✅ Using model: ${command.args.modelName}`
                        };
                    }
                    break;
                case 'stats':
                    result = await this.handleStats?.(command.args) ?? {
                        error: 'Stats not implemented',
                        output: null
                    };
                    break;
                case 'pgb_search':
                    result = await this.pgbHandler.handleSearch(command.args);
                    break;
                case 'pgb_info':
                    result = await this.pgbHandler.handleInfo(command.args);
                    break;
                case 'pgb_download':
                    result = await this.pgbHandler.handleDownload(command.args);
                    break;
                default:
                    result = {
                        error: `Unknown command: ${command.name}`,
                        output: null
                    };
                    break;
            }
            return result;
        } catch (error) {
            result = {
                error: `Error processing command: ${error.message}`,
                output: null
            };
            return result;
        }
    }

    /**
     * Handle the "train" command
     * @param {Object} params - The command parameters
     * @returns {Promise<Object>} - The result of the training
     */
    async handleTrain(params) {
        return this.trainHandler.handleTrain(params);
    }


    /**
     * Handle the "generate" command
     * @param {Object} params - The command parameters
     * @returns {Promise<Object>} - The result of the generation
     */
    async handleGenerate(params) {
        return this.generateHandler.handleGenerate(params);
    }

    /**
     * Handle the "listmodels" command
     * @returns {Promise<Object>} - The list of models
     */
    async handleListModels() {
        return this.operationsHandler.handleListModels();
    }

    /**
     * Handle the "listcorpus" command
     * @returns {Promise<Object>} - The list of corpus files
     */
    async handleListCorpus() {
        return this.operationsHandler.handleListCorpus();
    }

    /**
     * Handle the "deletemodel" command
     * @param {Object} params - The command parameters
     * @returns {Promise<Object>} - The result of the deletion
     */
    async handleDeleteModel(params) {
        return this.operationsHandler.handleDeleteModel(params);
    }
    /**
     * Get the help text for the application
     * @returns {string} - The help text
     */
    getHelpText() {
        return `
🔗 Markov Chain Text Generator
=============================

Available commands:
train(file, modelType, [options]) - Train model from text file
    Required:
        file - Corpus file to train from
        modelType - "markov", "vlmm", or "hmm"
    Options (key=value):
        order=N - Markov order (default: 2)
        modelName=name.json - Save as specific filename

generate(model, [options]) - Generate text from model
    Required:
        model - Model file to use
    Options (key=value):
        length=N - Number of tokens to generate (default: 100)
        temperature=N - Randomness factor (0-2, default: 1)
        prompt="text" - Starting text for generation

listModels() - List available saved models
listCorpus() - List available corpus files
delete("modelName.json") - Delete a saved model
use("modelName.json") - Set current model to use
stats() - Show model statistics
pgb_search("query") - Search Project Gutenberg by title/author
pgb_info(id_or_title) - Get book details from Project Gutenberg
pgb_download(id|title, [file="filename.txt"]) - Download book from Project Gutenberg
help() - Show this help message
exit - Exit the program

Command Syntax:
• Function style: command(param1, param2, key=value)
• Object style: command({param1: value, key: value})
• Simple style: command
`;
    }
}