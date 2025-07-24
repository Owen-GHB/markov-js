#!/usr/bin/env node
// src/cli/CLI.js

import readline from 'readline';
import { MarkovModel } from '../core/MarkovModel.js';
import { TextProcessor } from '../core/TextProcessor.js';
import { TextGenerator } from '../core/TextGenerator.js';
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
        this.rl.on('line', (input) => {
            this.handleCommand(input.trim());
        });

        this.rl.on('close', () => {
            console.log('\nGoodbye!');
            process.exit(0);
        });

        // Handle Ctrl+C gracefully
        process.on('SIGINT', () => {
            console.log('\nUse "exit" or Ctrl+D to quit.');
            this.rl.prompt();
        });
    }

    /**
     * Display welcome message and available commands.
     */
    displayWelcome() {
        console.log('🔗 Markov Chain Text Generator');
        console.log('=============================');
        console.log('Available commands:');
        console.log('  build_dict("filename.txt", order=2)    - Build model from text file');
        console.log('  generate(length=100, order=2)          - Generate text');
        console.log('  save_model("model.json")               - Save current model');
        console.log('  load_model("model.json")               - Load saved model');
        console.log('  stats()                                - Show model statistics');
        console.log('  help()                                 - Show this help');
        console.log('  exit                                   - Quit program');
        console.log('\nType a command to get started!\n');
        this.rl.prompt();
    }

    /**
     * Main command handler
     * @param {string} input - User input command
     */
    async handleCommand(input) {
        if (!input) {
            this.rl.prompt();
            return;
        }

        try {
            const command = this.commandParser.parse(input);
            
            switch (command.name) {
                case 'build_dict':
                    await this.handleBuildDict(command.args);
                    break;
                case 'generate':
                    await this.handleGenerate(command.args);
                    break;
                case 'save_model':
                    await this.handleSaveModel(command.args);
                    break;
                case 'load_model':
                    await this.handleLoadModel(command.args);
                    break;
                case 'stats':
                    this.handleStats();
                    break;
                case 'help':
                    this.displayWelcome();
                    break;
                case 'exit':
                case 'quit':
                    this.rl.close();
                    return;
                default:
                    console.log(`❌ Unknown command: ${command.name}`);
                    console.log('Type "help()" for available commands.');
            }
        } catch (error) {
            console.log(`❌ Error: ${error.message}`);
        }

        this.rl.prompt();
    }

    /**
     * Handle build_dict command
     * @param {Object} args - Command arguments
     */
    async handleBuildDict(args) {
        const { filename, order = 2 } = args;
        
        if (!filename) {
            throw new Error('Filename is required. Usage: build_dict("corpus.txt", order=2)');
        }

        console.log(`📚 Building dictionary from "${filename}" with order ${order}...`);
        this.isTraining = true;

        try {
            // Read file
            const text = await this.fileHandler.readTextFile(filename);
            console.log(`📖 Read ${text.length} characters from file`);

            // Tokenize
            const tokens = this.processor.tokenize(text, {
                method: 'word',
                preservePunctuation: true,
                preserveCase: false
            });
            
            const stats = this.processor.getTokenStats(tokens);
            console.log(`🔤 Tokenized into ${stats.totalTokens} tokens (${stats.uniqueTokens} unique)`);

            // Build model
            this.model = new MarkovModel(order);
            this.model.buildChain(tokens);
            this.generator = new TextGenerator(this.model);
            this.currentOrder = order;

            console.log('✅ Model built successfully!');
            this.displayModelStats();

        } catch (error) {
            throw new Error(`Failed to build dictionary: ${error.message}`);
        } finally {
            this.isTraining = false;
        }
    }

    /**
     * Handle generate command
     * @param {Object} args - Command arguments
     */
    async handleGenerate(args) {
        if (!this.model || !this.generator) {
            throw new Error('No model loaded. Use build_dict() or load_model() first.');
        }

        const { 
            length = 100, 
            order = this.currentOrder,
            temperature = 1.0,
            startWith = null,
            samples = 1
        } = args;

        if (order !== this.currentOrder) {
            throw new Error(`Model was trained with order ${this.currentOrder}, cannot generate with order ${order}`);
        }

        console.log(`🎲 Generating ${samples} sample${samples > 1 ? 's' : ''} of ${length} tokens...`);

        try {
            if (samples === 1) {
                const result = this.generator.generate({
                    maxLength: length,
                    temperature: temperature,
                    startWith: startWith
                });

                console.log('\n📝 Generated text:');
                console.log('─'.repeat(50));
                console.log(result.text);
                console.log('─'.repeat(50));
                console.log(`Length: ${result.length} tokens | Stopped early: ${result.stoppedEarly}`);
            } else {
                const results = this.generator.generateSamples(samples, {
                    maxLength: length,
                    temperature: temperature,
                    startWith: startWith
                });

                results.forEach((result, index) => {
                    console.log(`\n📝 Sample ${index + 1}:`);
                    console.log('─'.repeat(30));
                    if (result.error) {
                        console.log(`❌ Error: ${result.error}`);
                    } else {
                        console.log(result.text);
                        console.log(`(${result.length} tokens)`);
                    }
                });
            }
        } catch (error) {
            throw new Error(`Generation failed: ${error.message}`);
        }
    }

    /**
     * Handle save_model command
     * @param {Object} args - Command arguments
     */
    async handleSaveModel(args) {
        if (!this.model) {
            throw new Error('No model to save. Build or load a model first.');
        }

        const { filename } = args;
        if (!filename) {
            throw new Error('Filename is required. Usage: save_model("model.json")');
        }

        console.log(`💾 Saving model to "${filename}"...`);

        try {
            await this.serializer.saveModel(this.model, filename);
            this.lastModelPath = filename;
            console.log('✅ Model saved successfully!');
        } catch (error) {
            throw new Error(`Failed to save model: ${error.message}`);
        }
    }

    /**
     * Handle load_model command
     * @param {Object} args - Command arguments
     */
    async handleLoadModel(args) {
        const { filename } = args;
        if (!filename) {
            throw new Error('Filename is required. Usage: load_model("model.json")');
        }

        console.log(`📂 Loading model from "${filename}"...`);

        try {
            this.model = await this.serializer.loadModel(filename);
            this.generator = new TextGenerator(this.model);
            this.currentOrder = this.model.order;
            this.lastModelPath = filename;

            console.log('✅ Model loaded successfully!');
            this.displayModelStats();
        } catch (error) {
            throw new Error(`Failed to load model: ${error.message}`);
        }
    }

    /**
     * Handle stats command
     */
    handleStats() {
        if (!this.model) {
            console.log('❌ No model loaded.');
            return;
        }

        this.displayModelStats();
    }

    /**
     * Display current model statistics
     */
    displayModelStats() {
        const stats = this.model.getStats();
        console.log('\n📊 Model Statistics:');
        console.log(`   Order: ${stats.order}`);
        console.log(`   States: ${stats.totalStates.toLocaleString()}`);
        console.log(`   Vocabulary: ${stats.vocabularySize.toLocaleString()} unique tokens`);
        console.log(`   Training tokens: ${stats.totalTokens.toLocaleString()}`);
        console.log(`   Start states: ${stats.startStates}`);
        console.log(`   Avg transitions per state: ${stats.avgTransitionsPerState.toFixed(2)}`);
        
        if (this.lastModelPath) {
            console.log(`   Last saved/loaded: ${this.lastModelPath}`);
        }
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