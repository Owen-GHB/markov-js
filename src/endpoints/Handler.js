import { MarkovModel } from '../models/Markov/Model.js';
import { VLMModel } from '../models/VLMM/Model.js';
import { GenerationContext } from '../models/Interfaces.js';
import { Tokenizer } from '../models/Tokenizer.js';
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
                    output: null
                };
        }
    }

    async handleTrain(params) {
        const output = [];
        const { filename, modelName, order = 2 } = params || {};

        if (!filename || !modelName) {
            return {
                error: "Training failed: filename and modelName are required",
                output: null
            };
        }

        try {
            const text = await this.fileHandler.readTextFile(filename);
            const tokens = this.processor.tokenize(text, {
                method: 'word',
                preservePunctuation: true,
                preserveCase: false
            });

            const model = new VLMModel({ order });
            model.train(tokens);
            await this.serializer.saveModel(model, modelName);

            const stats = model.getStats();
            output.push(
                `📚 Trained from "${filename}" → "${modelName}"`,
                `📊 Vocabulary: ${stats.vocabularySize.toLocaleString()}`
            );

            return { error: null, output: output.join('\n') };
        } catch (err) {
            return {
                error: `Training failed: ${err.message}`,
                output: null
            };
        }
    }


    async handleGenerate(params) {
        const { modelName, length = 100, temperature = 1.0, samples = 1, ...rest } = params || {};

        if (!modelName) {
            return {
                error: "Generation failed: modelName is required",
                output: null
            };
        }

        try {
            const model = await this.serializer.loadModel(modelName);

            const context = new GenerationContext({
                max_tokens: length,
                temperature: temperature,
                ...rest
            });

            const results = (samples === 1)
                ? [model.generate(context)]
                : model.generateSamples(samples, context);

            const output = ['🎲 Generated text:', '─'.repeat(50)];
            results.forEach((result, i) => {
                if (result.error) {
                    output.push(`❌ Sample ${i + 1}: ${result.error}`);
                } else {
                    output.push(result.text, `(Length: ${result.length} tokens)`, '─'.repeat(50));
                    output.push(`(Finish reason: ${result.finish_reason})`);
                }
            });

            return { error: null, output: output.join('\n') };
        } catch (err) {
            return {
                error: `Generation failed: ${err.message}`,
                output: null
            };
        }
    }
}