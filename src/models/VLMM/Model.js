import { TextModel, GenerationContext, GenerationResult } from '../Interfaces.js';
import { VLMMNode } from './VLMMNode.js';
import { random } from '../../utils/RNG.js';

/**
 * Variable-Length Markov Model for text generation
 */
export class VLMModel extends TextModel {
    constructor(options = {}) {
        super(options);
        this.root = new VLMMNode();
        this.order = options.order || 5;
        if (!Number.isInteger(this.order) || this.order < 1 || this.order > 10) {
            throw new Error('order must be a positive integer between 1 and 10');
        }
        this.totalTokens = 0;
        this.vocabulary = new Set();
        this.modelType = 'vlmm';
    }

    /**
     * Get model capabilities
     * @returns {Object}
     */
    getCapabilities() {
        return {
            supportsTemperature: true,
            supportsConstraints: false,
            supportsConditionalGeneration: true,
            supportsBatchGeneration: true,
            maxOrder: 10,
            modelType: this.modelType
        };
    }

    train(tokens) {
        if (!Array.isArray(tokens) || tokens.some(t => typeof t !== 'string')) {
            throw new Error('Input tokens must be an array of strings.');
        }

        this.root = new VLMMNode();
        this.totalTokens = tokens.length;
        this.vocabulary = new Set(tokens);

        for (let i = 0; i < tokens.length - 1; i++) {
            const maxContext = Math.min(this.order, i);
            for (let k = 1; k <= maxContext; k++) {
                const context = tokens.slice(i - k, i);
                const next = tokens[i];
                this.root.addContext(context, next);
            }
            const next = tokens[i];
            this.root.addContext([], next);
        }
    }

    generate(context = new GenerationContext()) {
        const {
            max_tokens = 100,
            min_tokens = 50,
            stop: stop_tokens = ['.', '!', '?'],
            prompt = null,
            temperature = 1.0,
            randomFn = random,
            allowRepetition = true,
            max_context_length = this.order
        } = context;

        if (this.totalTokens === 0) {
            throw new Error('VLMM is not trained.');
        }

        const generated = [];
        const history = [];

        if (prompt) {
            const promptTokens = prompt.trim().split(/\s+/);
            generated.push(...promptTokens);
            history.push(...promptTokens.slice(-max_context_length));
        }

        let finish_reason = 'length';
        let attempts = 0;

        if (history.length === 0) {
            const firstToken = this.sampleNextToken([], temperature, randomFn);
            if (!firstToken) throw new Error('No valid transitions in model');
            generated.push(firstToken);
            history.push(firstToken);
        }

        while (generated.length < max_tokens && attempts < max_tokens * 3) {
            attempts++;
            const contextTokens = history.slice(-max_context_length);
            const nextToken = this.sampleNextToken(contextTokens, temperature, randomFn);

            if (!nextToken) {
                finish_reason = 'no_transitions';
                break;
            }

            if (!allowRepetition && generated[generated.length - 1] === nextToken) {
                continue;
            }

            generated.push(nextToken);
            history.push(nextToken);

            if (generated.length >= min_tokens && stop_tokens.includes(nextToken)) {
                finish_reason = 'stop';
                break;
            }
        }

        const finalText = this.postProcess(generated, context);
        return new GenerationResult(finalText, {
            tokens: generated,
            length: generated.length,
            model: 'vlmm',
            finish_reason,
            attempts
        });
    }

    sampleNextToken(contextTokens, temperature, randomFn = random) {
        for (let k = contextTokens.length; k >= 0; k--) {
            const subcontext = contextTokens.slice(contextTokens.length - k);
            const node = this.root.getNode(subcontext);
            const validNode = node || (k === 0 ? this.root : null);
            if (!validNode || validNode.nextCounts.size === 0) continue;

            const transitions = Array.from(node.nextCounts.entries());
            const totalCount = transitions.reduce((sum, [, count]) => sum + count, 0);
            const weighted = transitions.map(([token, count]) => {
                const prob = count / totalCount;
                return {
                    token,
                    probability: temperature === 0 ? prob : Math.pow(prob, 1 / temperature)
                };
            });

            const totalProb = weighted.reduce((sum, w) => sum + w.probability, 1e-10);
            const normalized = weighted.map(w => ({
                token: w.token,
                probability: w.probability / totalProb
            }));

            const rand = randomFn();
            let cumProb = 0;
            for (const { token, probability } of normalized) {
                cumProb += probability;
                if (rand <= cumProb) return token;
            }

            return normalized[normalized.length - 1].token;
        }

        return null;
    }

    toJSON() {
        return {
            order: this.order,
            modelType: this.modelType,
            totalTokens: this.totalTokens,
            vocabulary: Array.from(this.vocabulary),
            trie: this.root.toJSON()
        };
    }

    fromJSON(data) {
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid JSON input');
        }

        this.order = data.order || 5;
        this.totalTokens = data.totalTokens || 0;
        this.vocabulary = new Set(data.vocabulary || []);
        this.root = VLMMNode.fromJSON(data.trie || {});
    }

    getStats() {
        return {
            order: this.order,
            vocabularySize: this.vocabulary.size,
            totalTokens: this.totalTokens,
            totalNodes: this.root.countNodes(),
            totalTransitions: this.root.countTransitions()
        };
    }

    /**
     * Post-process generated tokens into readable text
     * @param {string[]} tokens - The tokens to process
     * @param {Object} [context={}] - The generation context
     * @returns {string} - The processed text
     */
    postProcess(tokens, context = {}) {
        if (tokens.length === 0) return '';
        let text = tokens.join(' ');

        text = text
            .replace(/\s+([.!?;:,'")\]}])/g, '$1')
            .replace(/([.!?;:,])(\w)/g, '$1 $2')
            .replace(/\s+(['"])/g, ' $1')
            .replace(/(['"()])\s+/g, '$1 ')
            .replace(/([.!?])\s+(\w)/g, (m, p, l) => `${p} ${l.toUpperCase()}`)
            .replace(/^\w/, m => m.toUpperCase())
            .replace(/\s+/g, ' ')
            .trim();

        return text;
    }

    /**
     * Generate multiple samples from the model
     * @param {number} count - The number of samples to generate
     * @param {GenerationContext} [context=new GenerationContext()] - The generation context
     * @returns {GenerationResult[]} - The generated samples
     */
    generateSamples(count, context = new GenerationContext()) {
        const results = [];
        for (let i = 0; i < count; i++) {
            try {
                results.push(this.generate(context));
            } catch (e) {
                results.push(new GenerationResult('', {
                    error: e.message,
                    model: 'vlmm',
                    finish_reason: 'error'
                }));
            }
        }
        return results;
    }
}
