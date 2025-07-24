#!/usr/bin/env node

import readline from 'readline';
import { MarkovModel } from '../core/models/MarkovModel.js';
import { TextProcessor } from '../core/text/TextProcessor.js';
import { TextGenerator } from '../core/text/TextGenerator.js';
import { FileHandler } from '../io/FileHandler.js';
import { ModelSerializer } from '../io/ModelSerializer.js';
import { CommandParser } from './CommandParser.js';

/**
 * REPL-style CLI for the Markov text generator
 * 
 * Design principles:
 * - Keep CLI logic separate from core functionality
 * - Easy to swap out for other interfaces (Discord bot, web UI, etc.)
 * - Provide helpful feedback and error handling
 */
export class MarkovCLI {
    constructor() {
        this.model = null;
        this.generator = null;
        this.processor = new TextProcessor();
        this.fileHandler = new FileHandler();
        this.serializer = new ModelSerializer();
        this.commandParser = new CommandParser();
        
        // Current session state
        this.currentOrder = 2;
        this.lastModelPath = null;
        this.isTraining = false;
        
        // Setup readline interface
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: 'markov> '
        });

        this.setupEventHandlers();
        this.displayWelcome();
    }

    /**
     * Setup readline event handlers.
     */
    setupEventHandlers() {
        this.rl.on('line', async (input) => {
            const { output, shouldExit } = await this.handleInput(input.trim());
            if (output) console.log(output);
            if (shouldExit) this.rl.close();
            else this.rl.prompt();
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
     * Display welcome message and available commands.
     */
    displayWelcome() {
        return [
            '🔗 Markov Chain Text Generator',
            '=============================',
            'Available commands:',
            '  train({filename: "file.txt", order: 2})    - Build model',
            '  generate({length: 100, temperature: 0.8})  - Generate text',
            '  save_model({filename: "model.json"})       - Save model',
            '  load_model({filename: "model.json"})       - Load model',
            '  stats()                                   - Show stats',
            '  help()                                    - Show help',
            '  exit                                      - Quit program',
            '',
            'Type a command to get started!'
        ].join('\n');
    }

    /**
     * Handle raw user input and transform it into command processing
     * @param {string} input - Raw user input
     * @returns {Promise<{output: string, shouldExit: boolean}>} - Result object
     */
    async handleInput(input) {
        if (!input) {
            return { output: '', shouldExit: false };
        }

        try {
            const command = this.commandParser.parse(input);
            return await this.handleCommand(command);
        } catch (error) {
            return { 
                output: `❌ Error: ${error.message}`,
                shouldExit: false
            };
        }
    }

    /**
     * Handle parsed command object
     * @param {Object} command - Parsed command {name, args}
     * @returns {Promise<{output: string, shouldExit: boolean}>} - Result object
     */
    async handleCommand(command) {
        switch (command.name) {
            case 'train':
                return {
                    output: await this.handleTrain(command.args),
                    shouldExit: false
                };
            case 'generate':
                return {
                    output: await this.handleGenerate(command.args),
                    shouldExit: false
                };
            case 'save_model':
                return {
                    output: await this.handleSaveModel(command.args),
                    shouldExit: false
                };
            case 'load_model':
                return {
                    output: await this.handleLoadModel(command.args),
                    shouldExit: false
                };
            case 'stats':
                return {
                    output: this.handleStats(),
                    shouldExit: false
                };
            case 'help':
                return {
                    output: this.displayWelcome(),
                    shouldExit: false
                };
            case 'exit':
            case 'quit':
                return { output: 'Goodbye!', shouldExit: true };
            default:
                return {
                    output: `❌ Unknown command: ${command.name}\nType "help()" for available commands.`,
                    shouldExit: false
                };
        }
    }

    async handleTrain(args) {
        const { filename, order = 2 } = args;
        
        if (!filename) {
            throw new Error('Filename is required. Usage: train({filename: "corpus.txt", order: 2})');
        }

        this.isTraining = true;
        try {
            const text = await this.fileHandler.readTextFile(filename);
            const tokens = this.processor.tokenize(text, {
                method: 'word',
                preservePunctuation: true,
                preserveCase: false
            });
            
            this.model = new MarkovModel({ order });
            this.model.train(tokens, { caseSensitive: false, trackStartStates: false });
            this.generator = new TextGenerator(this.model);
            this.currentOrder = order;

            const stats = this.model.getStats();
            return [
                `📚 Trained model from "${filename}" with order ${order}`,
                `📊 Model Statistics:`,
                `   States: ${stats.totalStates.toLocaleString()}`,
                `   Vocabulary: ${stats.vocabularySize.toLocaleString()} unique tokens`,
                `✅ Model ready for generation!`
            ].join('\n');
        } finally {
            this.isTraining = false;
        }
    }

    /**
     * Handle generate command
     * @param {Object} args - Command arguments
     * @returns {Promise<string>} - Generated output
     */
    async handleGenerate(args) {
        if (!this.model || !this.generator) {
            throw new Error('No model loaded. Use train() or load_model() first.');
        }

        const { 
            length = 100, 
            temperature = 1.0,
            startWith = null,
            samples = 1
        } = args;

        try {
            let output = [`🎲 Generating ${samples} sample${samples > 1 ? 's' : ''} of ${length} tokens...`];
            
            if (samples === 1) {
                const result = this.generator.generate({
                    maxLength: length,
                    temperature: temperature,
                    startWith: startWith
                });

                output.push(
                    '\n📝 Generated text:',
                    '─'.repeat(50),
                    result.text,
                    '─'.repeat(50),
                    `Length: ${result.length} tokens | Stopped early: ${result.stoppedEarly}`
                );
            } else {
                const results = this.generator.generateSamples(samples, {
                    maxLength: length,
                    temperature: temperature,
                    startWith: startWith
                });

                results.forEach((result, index) => {
                    output.push(
                        `\n📝 Sample ${index + 1}:`,
                        '─'.repeat(30),
                        result.error ? `❌ Error: ${result.error}` : result.text,
                        result.error ? '' : `(${result.length} tokens)`
                    );
                });
            }

            return output.join('\n');
        } catch (error) {
            throw new Error(`Generation failed: ${error.message}`);
        }
    }

    /**
     * Handle save_model command
     * @param {Object} args - Command arguments
     * @returns {Promise<string>} - Operation result
     */
    async handleSaveModel(args) {
        if (!this.model) {
            throw new Error('No model to save. Build or load a model first.');
        }

        const { filename } = args;
        if (!filename) {
            throw new Error('Filename is required. Usage: save_model({filename: "model.json"})');
        }

        try {
            await this.serializer.saveModel(this.model, filename);
            this.lastModelPath = filename;
            return `💾 Model saved to "${filename}"\n✅ Model saved successfully!`;
        } catch (error) {
            throw new Error(`Failed to save model: ${error.message}`);
        }
    }

    /**
     * Handle load_model command
     * @param {Object} args - Command arguments
     * @returns {Promise<string>} - Operation result
     */
    async handleLoadModel(args) {
        const { filename } = args;
        if (!filename) {
            throw new Error('Filename is required. Usage: load_model({filename: "model.json"})');
        }

        try {
            this.model = await this.serializer.loadModel(filename);
            this.generator = new TextGenerator(this.model);
            this.currentOrder = this.model.order;
            this.lastModelPath = filename;

            return [
                `📂 Model loaded from "${filename}"`,
                '✅ Model loaded successfully!',
                this.displayModelStats()
            ].join('\n');
        } catch (error) {
            throw new Error(`Failed to load model: ${error.message}`);
        }
    }

    /**
     * Handle stats command
     * @returns {string} - Statistics output
     */
    handleStats() {
        if (!this.model) {
            return '❌ No model loaded.';
        }
        return this.displayModelStats();
    }

    /**
     * Display current model statistics
     */
    displayModelStats() {
        if (!this.model) return '❌ No model loaded.';
        
        const stats = this.model.getStats();

        return [
        '📊 Model Statistics:',
        `   Order: ${stats.order}`,
        `   States: ${stats.totalStates.toLocaleString()}`,
        `   Vocabulary: ${stats.vocabularySize.toLocaleString()} unique tokens`,
        `   Training tokens: ${stats.totalTokens.toLocaleString()}`,
        `   Start states: ${stats.startStates}`,
        `   Avg transitions per state: ${stats.avgTransitionsPerState.toFixed(2)}`,
        this.lastModelPath ? `   Last saved/loaded: ${this.lastModelPath}` : ''
    ].join('\n');
    }

    /**
     * Start the CLI
     */
    start() {
        this.rl.prompt();
    }
}

// Only execute if this is the main module (not when imported)
if (process.argv[1] === new URL(import.meta.url).pathname) {
    const cli = new MarkovCLI();
    cli.start();
}