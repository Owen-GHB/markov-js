import { MarkovModel } from '../core/models/MarkovModel.js';
import { TextProcessor } from '../core/text/TextProcessor.js';
import { TextGenerator } from '../core/text/TextGenerator.js';
import { FileHandler } from '../io/FileHandler.js';
import { ModelSerializer } from '../io/ModelSerializer.js';

export class AppInterface {
    constructor() {
        this.processor = new TextProcessor();
        this.fileHandler = new FileHandler();
        this.serializer = new ModelSerializer();
    }

    /**
     * Train a model from corpus text
     * @param {Object} params - {filename: string, modelName: string, order?: number}
     * @throws {Error} If required parameters are missing
     */
    async train(params) {
        if (!params.filename) throw new Error("filename is required");
        if (!params.modelName) throw new Error("modelName is required");
        
        const { filename, modelName, order = 2 } = params;

        const text = await this.fileHandler.readTextFile(filename);
        const tokens = this.processor.tokenize(text, {
            method: 'word',
            preservePunctuation: true,
            preserveCase: false
        });
        
        const model = new MarkovModel({ order });
        model.train(tokens);
        await this.serializer.saveModel(model, modelName);

        return {
            stats: model.getStats(),
            modelName,
            filename
        };
    }

    /**
     * Generate text from a model
     * @param {Object} params - {modelName: string, length?: number, ...}
     * @throws {Error} If required parameters are missing
     */
    async generate(params) {
        if (!params.modelName) throw new Error("modelName is required");
        
        const { modelName, length = 100, temperature = 1.0, samples = 1 } = params;
        const model = await this.serializer.loadModel(modelName);
        const generator = new TextGenerator(model);

        if (samples === 1) {
            return { results: [generator.generate({ maxLength: length, temperature })] };
        }
        return { results: generator.generateSamples(samples, { maxLength: length, temperature }) };
    }
}