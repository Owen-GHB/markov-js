import readline from 'readline';
import { AppInterface } from './Handler.js';
import { CommandParser } from './CommandParser.js';

export class MarkovCLI {
    constructor() {
        this.app = new AppInterface();
        this.commandParser = new CommandParser();
        this.defaultModelName = 'sample.json';
        this.defaultCorpusName = 'sample.txt';
        
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: 'markov> ',
            completer: (line) => this.commandCompleter(line)
        });
        
        this.setupEventHandlers();
        console.log(this.displayWelcome());
    }

    setupEventHandlers() {
        this.rl.on('line', async (input) => {
            const trimmed = input.trim();
            if (trimmed) {
                // Parse the command
                const parseResult = this.commandParser.parse(trimmed);
                
                if (parseResult.error) {
                    console.error(`❌ ${parseResult.error}`);
                    this.rl.prompt();
                    return;
                }
                
                // Create command with defaults
                const command = {
                    ...parseResult.command,
                    args: this.withDefaults(parseResult.command)
                };

                try {        
                    let result;
                    switch (command.name) {
                        case 'help':
                            result = { 
                                error: null, 
                                output: this.displayWelcome() 
                            };
                            break;
                        case 'exit':
                            this.rl.close();
                            result = { 
                                error: null, 
                                output: null 
                            };
                            break;
                        default:
                            result = await this.app.handleCommand(command);
                            break;
                    }

                    if (result.error) console.error(`❌ ${result.error}`);
                    if (result.output) console.log(result.output);
                } catch (error) {
                    console.error(`❌ Error processing command: ${error.message}`);
                }
            }
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

    commandCompleter(line) {
        const commands = ['train', 'generate', 'help', 'exit'];
        const hits = commands.filter(c => c.startsWith(line));
        return [hits.length ? hits : commands, line];
    }

    displayWelcome() {
        return [
            '🔗 Markov Chain Text Generator',
            '=============================',
            'Available commands:',
            '  train(file, modeltype, [order]) - Train model from text file',
            '    modeltypes: "markov", "vlmm", "hmm"',
            '    order: Markov order (default: 2)',
            '  generate(model, [length])      - Generate text from model',
            '  stats()                        - Show model statistics',
            '  help()                         - Show this help message',
            '  exit                           - Exit the program',
            '',
            'Examples:',
            '  train("corpus.txt", "markov", 2)',
            '  train(file="corpus.txt", modeltype="vlmm")',
            '  generate("model.json", 50)',
            '  generate(model="model.json")'
        ].join('\n');
    }

    /**
     * Apply CLI defaults to command arguments
     * @param {Object} command - Parsed command object
     * @returns {Object} - Command with defaults applied
     */
    withDefaults(command) {
        const args = command.args || {};
        // For training commands
        if (command.name === 'train' && !args.filename && !args.modelName) {
            return { 
                ...args, 
                filename: this.defaultCorpusName,
                modelName: this.defaultModelName 
            };
        }
        
        // For model operations
        if ((command.name === 'generate') && !args.modelName) {
            return { ...args, modelName: this.defaultModelName };
        }
        
        return args;
    }

    start() {
        this.rl.prompt();
    }
}