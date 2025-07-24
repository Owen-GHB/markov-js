// src/core/MarkovModel.js
import { TextModel } from './models/ModelInterface.js';

/**
 * Configurable Markov Chain Model for text generation
 * 
 * Design decisions:
 * - Uses Map for O(1) lookup performance vs plain objects
 * - Stores transitions as frequency counts for flexibility
 * - Separates chain building from text generation for modularity
 */
export class MarkovModel extends TextModel {
    /**
     * @param {number} order - The order of the Markov chain (default: 2)
     * @param {object} config - Additional model configuration
     */
    constructor(order = 2, config = {}) {
        super(order);
        if (order < 1) {
            throw new Error('Markov chain order must be at least 1');
        }
        
        // Map<string, Map<string, number>> - state -> {next_token: count}
        this.chains = new Map();
        // Track all possible starting states (for generation)
        this.startStates = new Set();
        this.totalTokens = 0;
        this.vocabulary = new Set();
        this.config = config;
    }

    /**
     * @override
     * @param {string[]} tokens - Array of preprocessed tokens
     * @param {Object} options - Additional options
     * @param {boolean} options.caseSensitive - Whether to preserve case (default: false)
     * @param {boolean} options.trackStartStates - Whether to track sentence starts (default: true)
     */
    train(tokens, options = {}) {
        const { caseSensitive = false, trackStartStates = true } = options;
        
        if (tokens.length < this.order + 1) {
            throw new Error(`Need at least ${this.order + 1} tokens to build chain of order ${this.order}`);
        }

        // Clear existing chain
        this.chains.clear();
        this.startStates.clear();
        this.vocabulary.clear();
        this.totalTokens = tokens.length;

        // Process tokens with case normalization if needed
        const processedTokens = caseSensitive ? tokens : tokens.map(t => t.toLowerCase());
        
        // Build vocabulary
        processedTokens.forEach(token => this.vocabulary.add(token));

        // Build n-gram chains
        for (let i = 0; i <= processedTokens.length - this.order - 1; i++) {
            // Create state from n tokens
            const state = processedTokens.slice(i, i + this.order).join(' ');
            const nextToken = processedTokens[i + this.order];

            // Track starting states (states that begin sentences/documents)
            if (trackStartStates && i === 0) {
                this.startStates.add(state);
            }

            // Initialize chain entry if not exists
            if (!this.chains.has(state)) {
                this.chains.set(state, new Map());
            }

            // Update transition counts
            const transitions = this.chains.get(state);
            transitions.set(nextToken, (transitions.get(nextToken) || 0) + 1);
        }

        console.log(`Built Markov chain: ${this.chains.size} states, ${this.vocabulary.size} unique tokens`);
    }

    /**
     * Get all possible next tokens for a given state with their probabilities
     * @param {string} state - Current state (n-gram)
     * @returns {Array<{token: string, probability: number}>}
     */
    getTransitions(state) {
        if (!this.chains.has(state)) {
            return [];
        }

        const transitions = this.chains.get(state);
        const totalCount = Array.from(transitions.values()).reduce((sum, count) => sum + count, 0);
        
        return Array.from(transitions.entries()).map(([token, count]) => ({
            token,
            probability: count / totalCount,
            count
        }));
    }

    /**
     * Sample next token based on transition probabilities
     * @param {string} state - Current state
     * @param {Function} randomFn - Random function (default: Math.random)
     * @returns {string|null} - Next token or null if no transitions available
     */
    sampleNextToken(state, randomFn = Math.random) {
        const transitions = this.getTransitions(state);
        
        if (transitions.length === 0) {
            return null;
        }

        // Weighted random selection
        const rand = randomFn();
        let cumulativeProbability = 0;
        
        for (const { token, probability } of transitions) {
            cumulativeProbability += probability;
            if (rand <= cumulativeProbability) {
                return token;
            }
        }
        
        // Fallback to last token (should rarely happen due to floating point precision)
        return transitions[transitions.length - 1].token;
    }

    /**
     * Get a random starting state for text generation
     * @param {Function} randomFn - Random function (default: Math.random)
     * @returns {string|null} - Starting state or null if none available
     */
    getRandomStartState(randomFn = Math.random) {
        if (this.startStates.size === 0) {
            // Fallback to any available state
            const allStates = Array.from(this.chains.keys());
            if (allStates.length === 0) return null;
            return allStates[Math.floor(randomFn() * allStates.length)];
        }
        
        const startStatesArray = Array.from(this.startStates);
        return startStatesArray[Math.floor(randomFn() * startStatesArray.length)];
    }

    /**
     * @override
     * @returns {Object} - Model statistics
     */
    getStats() {
        return {
            order: this.order,
            totalStates: this.chains.size,
            vocabularySize: this.vocabulary.size,
            totalTokens: this.totalTokens,
            startStates: this.startStates.size,
            avgTransitionsPerState: this.chains.size > 0 ? 
                Array.from(this.chains.values()).reduce((sum, transitions) => sum + transitions.size, 0) / this.chains.size : 0
        };
    }

    /**
     * @override
     * @returns {Object} - Serializable model data
     */
    toJSON() {
        return {
            order: this.order,
            chains: Object.fromEntries(
                Array.from(this.chains.entries()).map(([state, transitions]) => [
                    state,
                    Object.fromEntries(transitions)
                ])
            ),
            startStates: Array.from(this.startStates),
            totalTokens: this.totalTokens,
            vocabulary: Array.from(this.vocabulary)
        };
    }

    /**
     * @override
     * @param {Object} data - Serialized model data
     */
    fromJSON(data) {
        this.order = data.order;
        this.totalTokens = data.totalTokens;
        this.vocabulary = new Set(data.vocabulary || []);
        this.startStates = new Set(data.startStates || []);
        
        this.chains = new Map();
        for (const [state, transitions] of Object.entries(data.chains)) {
            this.chains.set(state, new Map(Object.entries(transitions).map(([token, count]) => [token, Number(count)])));
        }
    }

    /**
     * @override
     * @param {object} options - Generation parameters
     * @returns {string} Generated text
     */
    generate(options) {
        // This will be properly implemented later
        return "Not implemented";
    }
}