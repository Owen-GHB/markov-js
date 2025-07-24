import readline from 'readline';
import { AppInterface } from './AppInterface.js';
import { MarkovModel } from '../core/models/MarkovModel.js';
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
            prompt: 'markov> '
        });
        
        this.setupEventHandlers();
        console.log(this.displayWelcome());
    }

    setupEventHandlers() {
        this.rl.on('line', async (input) => {
            const trimmed = input.trim();
            if (trimmed.toLowerCase() === 'exit') {
                this.rl.close();
                return;
            }

            const { error, output } = await this.handleInput(trimmed);
            if (error) console.error(`❌ ${error}`);
            if (output) console.log(output);
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

    async handleInput(input) {
        if (!input) return { error: null, output: null };
        try {
            const command = this.commandParser.parse(input);
            return await this.handleCommand(command);
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

    async handleCommand(command) {
        switch (command.name) {
            case 'train':
                return await this.handleTrain(this.withDefaults(command));
            case 'generate':
                return await this.handleGenerate(this.withDefaults(command));
            case 'help':
                return { error: null, output: this.displayWelcome() };
            default:
                return {
                    error: `Unknown command: ${command.name}`,
                    output: 'Type "help()" for available commands.'
                };
        }
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

    async handleTrain(args) {
        try {
            const { stats, modelName, filename } = await this.app.train(args);
            return {
                error: null,
                output: [
                    `📚 Trained from "${filename}" → "${modelName}"`,
                    `📊 States: ${stats.totalStates.toLocaleString()}`,
                    `📊 Vocabulary: ${stats.vocabularySize.toLocaleString()}`
                ].join('\n')
            };
        } catch (error) {
            return { 
                error: `Training failed: ${error.message}`,
                output: 'Usage: train({filename: "text.txt", modelName: "model.json"})'
            };
        }
    }

    async handleGenerate(args) {
        try {
            const { results } = await this.app.generate(args);
            const output = ['🎲 Generated text:', '─'.repeat(50)];

            results.forEach((result, i) => {
                if (result.error) {
                    output.push(`❌ Sample ${i+1}: ${result.error}`);
                } else {
                    output.push(
                        result.text,
                        `(Length: ${result.length} tokens)`,
                        '─'.repeat(50)
                    );
                }
            });

            return { error: null, output: output.join('\n') };
        } catch (error) {
            return { 
                error: `Generation failed: ${error.message}`,
                output: 'Usage: generate({modelName: "model.json", length: 100})'
            };
        }
    }

    start() {
        this.rl.prompt();
    }
}