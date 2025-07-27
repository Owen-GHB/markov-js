import { TextModel, GenerationContext, GenerationResult } from '../Interfaces.js';
import { VLMMNode } from './VLMMNode.js';
import { random } from '../../utils/RNG.js';

/**
 * Variable-Length Markov Model for text generation
 * Fixed training logic and improved context handling
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

    /**
     * Train the VLMM on tokens
     * Fixed: Use correct next tokens and proper context building
     */
    train(tokens) {
        if (!Array.isArray(tokens) || tokens.some(t => typeof t !== 'string')) {
            throw new Error('Input tokens must be an array of strings.');
        }

        if (tokens.length < 2) {
            throw new Error('Need at least 2 tokens to train VLMM');
        }

        this.root = new VLMMNode();
        this.totalTokens = tokens.length;
        this.vocabulary = new Set(tokens);

        // Build contexts of all lengths up to order
        for (let i = 0; i < tokens.length - 1; i++) {
            const next = tokens[i + 1]; // Fixed: use actual next token
            
            // Add empty context (0-gram)
            this.root.addContext([], next);
            
            // Add contexts of increasing length
            const maxContextLen = Math.min(this.order, i + 1);
            for (let contextLen = 1; contextLen <= maxContextLen; contextLen++) {
                const context = tokens.slice(i + 1 - contextLen, i + 1);
                this.root.addContext(context, next);
            }
        }

        console.log(`VLMM trained: ${this.root.countNodes()} nodes, ${this.vocabulary.size} vocabulary`);
    }

    generate(context = new GenerationContext()) {
        const {
            max_tokens = 100,
            min_tokens = 50,
            stop: stop_tokens = ['.', '!', '?'],
            prompt = null,
            temperature = 1.0,
            randomFn = random,
            allowRepetition = true
        } = context;

        if (this.totalTokens === 0) {
            throw new Error('VLMM is not trained.');
        }

        const generated = [];
        const history = [];

        // Handle prompt
        if (prompt) {
            const promptTokens = prompt.trim().split(/\s+/);
            generated.push(...promptTokens);
            history.push(...promptTokens);
        }

        let finish_reason = 'length';
        let attempts = 0;
        const maxAttempts = max_tokens * 3;

        // Generate first token if no prompt
        if (history.length === 0) {
            const firstToken = this.sampleNextToken([], temperature, randomFn);
            if (!firstToken) throw new Error('No valid transitions in model');
            generated.push(firstToken);
            history.push(firstToken);
        }

        while (generated.length < max_tokens && attempts < maxAttempts) {
            attempts++;
            
            // Use up to order tokens as context
            const contextTokens = history.slice(-this.order);
            const nextToken = this.sampleNextToken(contextTokens, temperature, randomFn);

            if (!nextToken) {
                finish_reason = 'no_transitions';
                break;
            }

            if (!allowRepetition && generated.length > 0 && 
                generated[generated.length - 1] === nextToken) {
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

    /**
     * Sample next token using variable-length context
     * Fixed: Proper fallback through shorter contexts
     */
    sampleNextToken(contextTokens, temperature, randomFn = random) {
        // Try contexts from longest to shortest
        for (let contextLen = contextTokens.length; contextLen >= 0; contextLen--) {
            const context = contextTokens.slice(-contextLen);
            const node = this.root.getNode(context);
            
            if (!node || node.nextCounts.size === 0) {
                continue;
            }

            // Found a valid context with transitions
            const transitions = Array.from(node.nextCounts.entries());
            const totalCount = transitions.reduce((sum, [, count]) => sum + count, 0);
            
            if (temperature === 0) {
                // Deterministic: pick most frequent
                const [bestToken] = transitions.reduce((best, current) => 
                    current[1] > best[1] ? current : best
                );
                return bestToken;
            }

            // Apply temperature scaling
            const weighted = transitions.map(([token, count]) => {
                const prob = count / totalCount;
                return {
                    token,
                    probability: Math.pow(prob, 1 / temperature)
                };
            });

            const totalProb = weighted.reduce((sum, w) => sum + w.probability, 1e-10);
            const normalized = weighted.map(w => ({
                token: w.token,
                probability: w.probability / totalProb
            }));

            // Sample from distribution
            const rand = randomFn();
            let cumProb = 0;
            for (const { token, probability } of normalized) {
                cumProb += probability;
                if (rand <= cumProb) return token;
            }

            // Fallback to last token
            return normalized[normalized.length - 1].token;
        }

        // If no valid context found, sample from vocabulary
        const vocabArray = Array.from(this.vocabulary);
        return vocabArray[Math.floor(randomFn() * vocabArray.length)];
    }

    /**
     * Get the best matching context for given tokens
     * @param {string[]} tokens - Context tokens
     * @returns {Object|null} - Node and context length used
     */
    getBestContext(tokens) {
        for (let len = Math.min(tokens.length, this.order); len >= 0; len--) {
            const context = tokens.slice(-len);
            const node = this.root.getNode(context);
            if (node && node.nextCounts.size > 0) {
                return { node, contextLength: len, context };
            }
        }
        return null;
    }

    /**
     * Get possible next tokens for a context
     * @param {string[]} context - Context tokens
     * @returns {Array} - Array of {token, probability, count}
     */
    getPossibleNextTokens(context) {
        const match = this.getBestContext(context);
        if (!match) return [];

        const transitions = Array.from(match.node.nextCounts.entries());
        const totalCount = transitions.reduce((sum, [, count]) => sum + count, 0);
        
        return transitions.map(([token, count]) => ({
            token,
            count,
            probability: count / totalCount,
            contextLength: match.contextLength
        })).sort((a, b) => b.probability - a.probability);
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
        const stats = {
            order: this.order,
            vocabularySize: this.vocabulary.size,
            totalTokens: this.totalTokens,
            totalNodes: this.root.countNodes(),
            totalTransitions: this.root.countTransitions()
        };

        // Add context length distribution
        const contextLengths = new Map();
        this.root.getContextStats(contextLengths, 0);
        stats.contextLengthDistribution = Object.fromEntries(contextLengths);

        return stats;
    }

    /**
     * Post-process generated tokens into readable text
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