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

    train(tokens, options = {}) {
        const { caseSensitive = false, trackStartStates = true } = options;

        if (!Array.isArray(tokens) || tokens.some(t => typeof t !== 'string')) {
            throw new Error('Input tokens must be an array of strings.');
        }

        if (tokens.length < 2) {
            throw new Error('Need at least 2 tokens to train VLMM');
        }

        this.root = new VLMMNode();
        this.totalTokens = tokens.length;
        this.vocabulary = new Set();
        
        // Track sentence start contexts (similar to MarkovModel's startStates)
        this.startContexts = new Set();

        // Process tokens with case normalization if needed
        const processedTokens = caseSensitive ? tokens : tokens.map(t => t.toLowerCase());
        
        // Build vocabulary
        processedTokens.forEach(token => this.vocabulary.add(token));

        // Track sentence boundaries
        const sentenceEndings = new Set(['.', '!', '?']);
        let isStartOfSentence = true; // First token is always start of sentence

        // Build contexts of all lengths up to order
        for (let i = 0; i < processedTokens.length - 1; i++) {
            const next = processedTokens[i + 1];
            
            // Only add empty context (0-gram) for sentence starts
            if (trackStartStates && isStartOfSentence) {
                this.root.addContext([], next);
            }
            
            // Add contexts of increasing length
            const maxContextLen = Math.min(this.order, i + 1);
            for (let contextLen = 1; contextLen <= maxContextLen; contextLen++) {
                const context = processedTokens.slice(i + 1 - contextLen, i + 1);
                this.root.addContext(context, next);
                
                // Only store contexts that actually start at sentence boundaries
                const contextStartPos = i + 1 - contextLen;
                const isContextAtSentenceStart = (contextStartPos === 0) || 
                    (contextStartPos > 0 && sentenceEndings.has(processedTokens[contextStartPos - 1]));
                
                if (trackStartStates && isContextAtSentenceStart) {
                    this.startContexts.add(context.join(' '));
                }
            }

            // Update for next iteration: next position starts sentence if current token ends one
            isStartOfSentence = sentenceEndings.has(processedTokens[i]);
        }

        console.log(`VLMM trained: ${this.root.countNodes()} nodes, ${this.vocabulary.size} vocabulary`);
        console.log(`Start contexts: ${this.startContexts.size} (sentence beginnings)`);
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

        // Initialize generation state
        if (prompt) {
            // Handle user-provided prompt
            const promptTokens = prompt.trim().split(/\s+/);
            generated.push(...promptTokens);
            history.push(...promptTokens);
        } else {
            // Start with a sentence-beginning context or empty context
            const startContext = this.getRandomStartContext(randomFn);
            
            if (startContext === null) {
                throw new Error('No valid starting contexts available');
            }
            
            // If we got a non-empty start context, use it
            if (startContext.length > 0) {
                generated.push(...startContext);
                history.push(...startContext);
            }
            // If startContext is empty [], we'll generate from 0-gram below
        }

        let finish_reason = 'length';
        let attempts = 0;
        const maxAttempts = max_tokens * 3;

        while (generated.length < max_tokens && attempts < maxAttempts) {
            attempts++;
            
            // Use up to order tokens as context
            const contextTokens = history.slice(-this.order);
            const nextToken = this.sampleNextToken(contextTokens, temperature, randomFn);

            if (nextToken === null) {
                // No valid transitions from current context
                // Try to start a new sentence
                if (this.tryStartNewSentence(generated, history, temperature, randomFn)) {
                    continue; // Successfully started new sentence, continue generation
                } else {
                    // Can't start new sentence either
                    finish_reason = 'no_transitions';
                    break;
                }
            }

            // Check for repetition if not allowed
            if (!allowRepetition && generated.length > 0 && 
                generated[generated.length - 1] === nextToken) {
                continue;
            }

            generated.push(nextToken);
            history.push(nextToken);

            // Check stop conditions
            if (generated.length >= min_tokens && stop_tokens.includes(nextToken)) {
                finish_reason = 'stop';
                break;
            }
        }

        if (attempts >= maxAttempts) {
            finish_reason = 'max_attempts';
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
     * Helper method to try starting a new sentence when generation gets stuck
     * @param {string[]} generated - Current generated tokens
     * @param {string[]} history - Current history for context tracking  
     * @param {number} temperature - Temperature for sampling
     * @param {Function} randomFn - Random function
     * @returns {boolean} - True if new sentence was started successfully
     */
    tryStartNewSentence(generated, history, temperature, randomFn) {
        // Try to get a sentence-starting context
        const startContext = this.getRandomStartContext(randomFn);
        
        if (startContext === null) {
            return false; // No valid start contexts available
        }
        
        if (startContext.length === 0) {
            // Empty context - sample from sentence-starting 0-grams
            const sentenceToken = this.sampleNextToken([], temperature, randomFn);
            if (sentenceToken !== null) {
                generated.push(sentenceToken);
                history.push(sentenceToken);
                return true;
            }
        } else {
            // Non-empty start context - use it directly
            generated.push(...startContext);
            history.push(...startContext);
            return true;
        }
        
        return false; // Failed to start new sentence
    }

    /**
     * Get a random starting context for generation
     * @param {Function} randomFn - Random function
     * @returns {string[]|null} - Starting context tokens or null if none available
     */
    getRandomStartContext(randomFn = random) {
        // First check if we have any sentence-starting contexts stored
        if (this.startContexts && this.startContexts.size > 0) {
            const startContextsArray = Array.from(this.startContexts);
            const randomContextStr = startContextsArray[Math.floor(randomFn() * startContextsArray.length)];
            return randomContextStr === '' ? [] : randomContextStr.split(' ');
        }
        
        // Fallback: check if 0-gram (empty context) has any transitions
        const emptyContextNode = this.root.getNode([]);
        if (emptyContextNode && emptyContextNode.nextCounts.size > 0) {
            return []; // Return empty array to indicate 0-gram sampling
        }
        
        // Last resort: try to find any context that has transitions
        // This maintains the variable-length behavior as a safety net
        const allContexts = this.getAllContextsWithTransitions();
        if (allContexts.length > 0) {
            const randomContext = allContexts[Math.floor(randomFn() * allContexts.length)];
            return randomContext;
        }
        
        return null; // No valid contexts found
    }

    
    /**
     * Helper method to get all contexts that have valid transitions
     * Used as a last resort fallback
     * @returns {string[][]} - Array of context token arrays
     */
    getAllContextsWithTransitions() {
        const contexts = [];
        
        // Check all possible context lengths
        for (let depth = 0; depth <= this.order; depth++) {
            const contextData = this.root.getContextsAtDepth(depth);
            for (const { context } of contextData) {
                contexts.push(context);
            }
        }
        
        return contexts;
    }

    /**
     * Check if a context represents a sentence start
     * @param {string[]} context - Context tokens to check  
     * @returns {boolean} - True if this is a sentence-starting context
     */
    isStartContext(context) {
        if (!this.startContexts) return false;
        const contextStr = context.join(' ');
        return this.startContexts.has(contextStr);
    }

    /**
     * Get all sentence-starting contexts
     * @returns {string[][]} - Array of starting context token arrays
     */
    getStartContexts() {
        if (!this.startContexts) return [];
        return Array.from(this.startContexts).map(contextStr => 
            contextStr === '' ? [] : contextStr.split(' ')
        );
    }

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

        const totalProb = weighted.reduce((sum, w) => sum + w.probability, 0);
        if (totalProb === 0) continue; // Skip if all probabilities are 0
        
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

    return null;
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
            startContexts: Array.from(this.startContexts),
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
        this.startContexts = new Set(data.startContexts || []);
        this.root = VLMMNode.fromJSON(data.trie || {});
    }

    getStats() {
        const stats = {
            order: this.order,
            vocabularySize: this.vocabulary.size,
            totalTokens: this.totalTokens,
            totalNodes: this.root.countNodes(),
            totalTransitions: this.root.countTransitions(),
            startContexts: this.startContexts.size
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