import readline from 'readline';
import { AppInterface } from './AppInterface.js';
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
                let command = this.commandParser.parse(trimmed);
                command.args = this.withDefaults(command);
                const { error, output } = await this.handleInput(command);
                if (error) console.error(`❌ ${error}`);
                if (output) console.log(output);
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

    async handleInput(command) {
        try {        
            switch (command.name) {
                case 'help':
                    return { error: null, output: this.displayWelcome() };
                case 'exit':
                    this.rl.close();
                    return { error: null, output: null };
                default:
                    return await this.app.handleCommand(command);
            }
        } catch (error) {
            return { error: error.message, output: null };
        }
    }

    displayWelcome() {
        return [
            '🔗 Markov Chain Text Generator',
            '=============================',
            'Available commands:',
            '  train({filename: "file.txt", modelName: "model.json"})',
            '  generate({modelName: "model.json"})',
            '  help()',
            '  exit',
            '',
            'Shortcuts (CLI only):',
            `  train() - uses "${this.defaultCorpusName}" and "${this.defaultModelName}"`,
            `  generate()/stats() - uses "${this.defaultModelName}"`
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