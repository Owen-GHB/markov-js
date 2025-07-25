import readline from 'readline';
import { AppInterface } from './Handler.js';
import { CommandParser } from './CommandParser.js';

export class MarkovCLI {
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
        console.log(this.commandParser.getHelpText());
    }

    setupEventHandlers() {
        this.rl.on('line', async (input) => {
            await this.handleLine(input);
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

    async handleLine(input) {
        const trimmed = input.trim();
        if (!trimmed) return;

        const parsedResult = this.commandParser.parse(trimmed);
        if (parsedResult.error) {
            console.error(`❌ ${parsedResult.error}`);
            return;
        }

        const command = {
            ...parsedResult.command,
            args: this.withDefaults(parsedResult.command)
        };

        try {
            let result;

        switch (command.name) {
            case 'help':
                result = {
                    error: null,
                    output: this.commandParser.getHelpText()
                };
                break;
            case 'exit':
                this.rl.close();
                return;
            case 'train':
                this.currentModel = command.args?.modelName || `${command.args.file.replace(/\.[^/.]+$/, '')}.json`;
                result = await this.app.handleTrain(command.args);
                break;
            case 'generate':
                if (!command.args.modelName) {
                    result = {
                        error: 'Error: no model selected',
                        output: null
                    };
                } else {
                    this.currentModel = command.args.modelName;
                    result = await this.app.handleGenerate(command.args);
                }
                break;
            case 'stats':
                result = await this.app.handleStats?.(command.args) ?? {
                    error: 'Stats not implemented',
                    output: null
                };
                break;
            default:
                result = {
                    error: `Unknown command: ${command.name}`,
                    output: null
                };
                break;
        }


            if (result.error) console.error(`❌ ${result.error}`);
            if (result.output) console.log(result.output);
        } catch (error) {
            console.error(`❌ Error processing command: ${error.message}`);
        }
    }


    commandCompleter(line) {
        const commands = ['train', 'generate', 'help', 'exit'];
        const hits = commands.filter(c => c.startsWith(line));
        return [hits.length ? hits : commands, line];
    }

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

    start() {
        this.rl.prompt();
    }
}