import { TextModel } from './ModelInterface.js';
import { random } from '../../utils/RNG.js';

/**
 * Configurable Markov Chain Model for text generation
 * 
 * Design decisions:
 * - Uses Map for O(1) lookup performance vs plain objects
 * - Stores transitions as frequency counts for flexibility
 */
export class MarkovModel extends TextModel {
    /**
     * @param {object} options - The model options.
     * @param {number} options.order - The order of the Markov chain (default: 2)
     */
    constructor(options = {}) {
        super(options);
        this.order = options.order || 2;
        if (!Number.isInteger(this.order) || this.order < 1) {
            throw new Error('Markov chain order must be a positive integer');
        }
        
        // Map<string, Map<string, number>> - state -> {next_token: count}
        this.chains = new Map();
        // Track all possible starting states (for generation)
        this.startStates = new Set();
        this.totalTokens = 0;
        this.vocabulary = new Set();
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

        if (!Array.isArray(tokens) || tokens.some(t => typeof t !== 'string')) {
            throw new Error('Input tokens must be an array of strings.');
        }
        
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

        // Track sentence boundaries (assuming sentence-ending punctuation)
        const sentenceEndings = new Set(['.', '!', '?']);
        let isStartOfSentence = true;

        // Build n-gram chains
        for (let i = 0; i <= processedTokens.length - this.order - 1; i++) {
            const state = processedTokens.slice(i, i + this.order).join(' ');
            const nextToken = processedTokens[i + this.order];
            
            // Track start states if enabled
            if (trackStartStates && isStartOfSentence) {
                this.startStates.add(state);
            }

            // Update sentence tracking
            isStartOfSentence = sentenceEndings.has(nextToken);

            if (!this.chains.has(state)) {
                this.chains.set(state, new Map());
            }
            const transitions = this.chains.get(state);
            transitions.set(nextToken, (transitions.get(nextToken) || 0) + 1);
        }

        console.log(`Built Markov chain: ${this.chains.size} states, ${this.vocabulary.size} unique tokens`);
        console.log(`Start states: ${this.startStates.size} (sentence beginnings)`);
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
     * @param {Function} randomFn - Random function (default: random)
     * @returns {string|null} - Next token or null if no transitions available
     */
    sampleNextToken(state, randomFn = random) {
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
     * @param {Function} randomFn - Random function (default: random)
     * @returns {string|null} - Starting state or null if none available
     */
    getRandomStartState(randomFn = random) {
        // First try to get a sentence-starting state if available
        if (this.startStates.size > 0) {
            const startStatesArray = Array.from(this.startStates);
            return startStatesArray[Math.floor(randomFn() * startStatesArray.length)];
        }
        
        // Fallback to any available state
        const allStates = Array.from(this.chains.keys());
        if (allStates.length === 0) return null;
        return allStates[Math.floor(randomFn() * allStates.length)];
    }

    /**
     * Get all possible starting states (sentence beginnings)
     * @returns {string[]} - Array of starting states
     */
    getStartStates() {
        return Array.from(this.startStates);
    }

    /**
     * Check if a given state is a known starting state
     * @param {string} state - State to check
     * @returns {boolean} - True if the state is a known starting state
     */
    isStartState(state) {
        return this.startStates.has(state);
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
        if (!data || typeof data !== 'object') {
            throw new Error('Invalid JSON data: must be an object.');
        }
        if (!Number.isInteger(data.order) || data.order < 1) {
            throw new Error('Invalid JSON data: order must be a positive integer.');
        }
        if (!data.chains || typeof data.chains !== 'object') {
            throw new Error('Invalid JSON data: chains object is missing or invalid.');
        }

        this.order = data.order;
        this.options = { order: data.order };
        this.totalTokens = data.totalTokens || 0;
        this.vocabulary = new Set(data.vocabulary || []);
        this.startStates = new Set(data.startStates || []);
        
        this.chains = new Map();
        for (const [state, transitions] of Object.entries(data.chains)) {
            if (typeof transitions !== 'object') {
                console.warn(`Skipping invalid transition for state "${state}": not an object.`);
                continue;
            }
            this.chains.set(state, new Map(Object.entries(transitions).map(([token, count]) => [token, Number(count)])));
        }
    }
}