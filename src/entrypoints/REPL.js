import readline from 'readline';
import { AppInterface } from './Handler.js';
import { CommandParser } from './CommandParser.js';

export class MarkovREPL {
    constructor() {
        this.app = new AppInterface();
        this.commandParser = new CommandParser();
        this.currentModel = null;
        this.defaultCorpus = 'sample.txt';
        this.defaultModelType = 'markov';
        
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: 'markov> ',
            completer: (line) => this.commandCompleter(line)
        });
        
        this.setupEventHandlers();
        console.log(this.app.getHelpText());
    }

    /**
     * Set up event handlers for the REPL
     */
    setupEventHandlers() {
        this.rl.on('line', async (input) => {
            input = input.trim();
            const parsedResult = this.commandParser.parse(input);
            if (parsedResult.error) {
                console.error(`❌ ${parsedResult.error}`);
                return;
            }

            const command = {
                ...parsedResult.command,
                args: this.withDefaults(parsedResult.command)
            };

            switch (command.name) {
                case 'train':
                    this.currentModel = command.args?.modelName || `${command.args.file.replace(/\.[^/.]+$/, '')}.json`;
                    break;
                case 'generate':
                    if (command.args?.modelName) this.currentModel = command.args.modelName;
                    break;
                case 'use':
                    if (command.args?.modelName) this.currentModel = command.args.modelName;
                    break;
                case 'exit':
                    this.rl.close();
                    return;
            }

            let result = await this.app.handleCommand(command);
            if (result.error) console.error(`❌ ${result.error}`);
            if (result.output) console.log(result.output);
            this.rl.prompt();
        });

        this.rl.on('close', () => {
            console.log('\nGoodbye!');
            process.exit(0);
        });

        process.on('SIGINT', () => {
            console.log('\nUse "exit" or Ctrl+D to quit.');
            this.rl.prompt();
        });
    }

    /**
     * Command completer for the REPL
     * @param {string} line - The current line
     * @returns {[string[], string]} - The completions and the line
     */
    commandCompleter(line) {
        const commands = ['train', 'generate', 'help', 'exit',
                        'listmodels', 'listcorpus', 'delete', 'use', 'stats'];
        const hits = commands.filter(c => c.startsWith(line));
        return [hits.length ? hits : commands, line];
    }

    /**
     * Add default values to a command
     * @param {Object} command - The command object
     * @returns {Object} - The command arguments with defaults
     */
    withDefaults(command) {
        const args = command.args || {};

        // For training commands
        if (command.name === 'train') {
            return { 
                ...args,
                file: args.file || this.defaultCorpus,
                modelType: args.modelType || this.defaultModelType
            };
        }

        // For generate commands
        if (command.name === 'generate') {
            return {
                ...args,
                modelName: args.modelName || this.currentModel
            };
        }

        return args;
    }

    /**
     * Start the REPL
     */
    start() {
        this.rl.prompt();
    }
}