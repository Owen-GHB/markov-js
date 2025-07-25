import { MarkovModel } from '../models/Markov/Model.js';
import { Tokenizer } from '../models/Markov/Tokenizer.js';
import { FileHandler } from '../io/FileHandler.js';
import { ModelSerializer } from '../io/ModelSerializer.js';

export class AppInterface {
    constructor() {
        this.processor = new Tokenizer();
        this.fileHandler = new FileHandler();
        this.serializer = new ModelSerializer();
    }

    async handleCommand(command) {
        switch (command.name) {
            case 'train':
                return await this.handleTrain(command.args);
            case 'generate':
                return await this.handleGenerate(command.args);
            default:
                return {
                    error: `Unknown command: ${command.name}`,
                    output: 'Type "help()" for available commands.'
                };
        }
    }

    async handleTrain(params) {
        const output = [];
        const { filename, modelName, order = 2 } = params || {};

        if (!filename || !modelName) {
            return {
                error: "Training failed: filename and modelName are required",
                output: 'Usage: train({filename: "text.txt", modelName: "model.json"})'
            };
        }

        try {
            const text = await this.fileHandler.readTextFile(filename);
            const tokens = this.processor.tokenize(text, {
                method: 'word',
                preservePunctuation: true,
                preserveCase: false
            });

            const model = new MarkovModel({ order });
            model.train(tokens);
            await this.serializer.saveModel(model, modelName);

            const stats = model.getStats();
            output.push(
                `📚 Trained from "${filename}" → "${modelName}"`,
                `📊 States: ${stats.totalStates.toLocaleString()}`,
                `📊 Vocabulary: ${stats.vocabularySize.toLocaleString()}`
            );

            return { error: null, output: output.join('\n') };
        } catch (err) {
            return {
                error: `Training failed: ${err.message}`,
                output: 'Usage: train({filename: "text.txt", modelName: "model.json"})'
            };
        }
    }


    async handleGenerate(params) {
        const { modelName, length = 100, temperature = 1.0, samples = 1 } = params || {};

        if (!modelName) {
            return {
                error: "Generation failed: modelName is required",
                output: 'Usage: generate({modelName: "model.json", length: 100})'
            };
        }

        try {
            const model = await this.serializer.loadModel(modelName);

            const results = (samples === 1)
                ? [model.generate({ maxLength: length, temperature })]
                : model.generateSamples(samples, { maxLength: length, temperature });

            const output = ['🎲 Generated text:', '─'.repeat(50)];
            results.forEach((result, i) => {
                if (result.error) {
                    output.push(`❌ Sample ${i + 1}: ${result.error}`);
                } else {
                    output.push(result.text, `(Length: ${result.length} tokens)`, '─'.repeat(50));
                }
            });

            return { error: null, output: output.join('\n') };
        } catch (err) {
            return {
                error: `Generation failed: ${err.message}`,
                output: 'Usage: generate({modelName: "model.json", length: 100})'
            };
        }
    }
}