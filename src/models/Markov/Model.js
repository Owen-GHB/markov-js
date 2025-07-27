import { TextModel, GenerationContext, GenerationResult } from '../Interfaces.js';
import { random } from '../../utils/RNG.js';

/**
 * Configurable Markov Chain Model for text generation
 * - Supports variable order (n-grams)
 * - Handles case sensitivity and punctuation
 * - Tracks starting states for sentence beginnings
 * - Generates text with temperature control
 * - Provides detailed statistics
 * - Serializes to/from JSON format
 * - Supports multiple generation options
 * - Allows for flexible tokenization and training
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
        this.modelType = 'markov';
    }

    /**
     * Get model capabilities
     * @returns {Object}
     */
    getCapabilities() {
        return {
            supportsTemperature: true,
            supportsConstraints: true,
            supportsConditionalGeneration: true,
            supportsBatchGeneration: true,
            maxOrder: 10,
            modelType: this.modelType
        };
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

            if (trackStartStates && isStartOfSentence) {
                this.startStates.add(state);
            }
            isStartOfSentence = sentenceEndings.has(processedTokens[i]);

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
            modelType: this.modelType,
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

    /**
     * Generate text using the Markov model
     * @param {GenerationContext} context - Generation options
     * @param {number} context.max_tokens - Maximum number of tokens to generate
     * @param {number} context.min_tokens - Minimum number of tokens to generate
     * @param {string[]} context.stop - Tokens that end generation
     * @param {string} context.prompt - Specific starting text (optional)
     * @param {number} context.temperature - Randomness factor (0-2, default: 1)
     * @param {Function} context.randomFn - Custom random function
     * @param {boolean} context.allowRepetition - Allow immediate token repetition
     * @returns {GenerationResult} - Generated text and metadata
     */
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

        if (max_tokens < 1) {
            throw new Error('max_tokens must be at least 1');
        }

        if (this.chains.size === 0) {
            throw new Error('Model has no trained data');
        }

        const generatedTokens = [];
        let currentState = this.initializeState(prompt, randomFn);

        if (!currentState) {
            throw new Error('Could not find a valid starting state');
        }

        // Add initial state tokens to output
        const stateTokens = currentState.split(' ');
        generatedTokens.push(...stateTokens);

        let attempts = 0;
        const maxAttempts = max_tokens * 3; // Prevent infinite loops
        let finish_reason = 'length';

        while (generatedTokens.length < max_tokens && attempts < maxAttempts) {
            attempts++;

            const nextToken = this.sampleNextToken(currentState, temperature, randomFn);

            if (!nextToken) {
                // No valid transitions, try to find a new starting point
                const newState = this.getRandomStartState(randomFn);
                if (newState) {
                    currentState = newState;
                    continue;
                } else {
                    break; // No more options
                }
            }

            // Check for repetition if not allowed
            if (!allowRepetition && generatedTokens.length > 0 &&
                generatedTokens[generatedTokens.length - 1] === nextToken) {
                continue;
            }

            generatedTokens.push(nextToken);

            // Check stop conditions
            if (generatedTokens.length >= min_tokens && stop_tokens.includes(nextToken)) {
                finish_reason = 'stop';
                break;
            }

            // Update state for next iteration
            currentState = this.updateState(currentState, nextToken);
        }

        const finalText = this.postProcess(generatedTokens, context);
        return new GenerationResult(finalText, {
            tokens: generatedTokens,
            length: generatedTokens.length,
            model: 'markov',
            finish_reason: finish_reason,
            finalState: currentState,
            attempts: attempts
        });
    }

    /**
     * Initialize the starting state for generation
     * @param {string|null} startWith - Optional starting text
     * @param {Function} randomFn - Random function
     * @returns {string|null} - Initial state
     */
    /**
     * Initialize the state for generation
     * @param {string|null} startWith - The text to start with
     * @param {Function} randomFn - The random function to use
     * @returns {string|null} - The initial state
     */
    initializeState(startWith, randomFn) {
        if (startWith) {
            if (!this.caseSensitive) {
                startWith = startWith.toLowerCase();
            }
            const startTokens = startWith.trim().split(/\s+/);
            if (startTokens.length >= this.order) {
                const proposedState = startTokens.slice(-this.order).join(' ');
                if (this.chains.has(proposedState)) {
                    return proposedState;
                }
            }
        }

        // Try to get a known sentence-starting state
        const randomStartState = this.getRandomStartState(randomFn);
        if (randomStartState) {
            return randomStartState;
        }

        // Fallback to random state from chains
        const states = Array.from(this.chains.keys());
        return states.length > 0
            ? states[Math.floor(randomFn() * states.length)]
            : null;
    }

    /**
     * Sample next token with temperature control
     * @param {string} currentState - Current model state
     * @param {number} temperature - Randomness factor (0-2)
     * @param {Function} randomFn - Random function
     * @returns {string|null} - Next token or null
     */
    /**
     * Sample the next token
     * @param {string} currentState - The current state
     * @param {number} temperature - The temperature to use
     * @param {Function} randomFn - The random function to use
     * @returns {string|null} - The next token
     */
    sampleNextToken(currentState, temperature, randomFn) {
        const transitions = this.getTransitions(currentState);

        if (transitions.length === 0) {
            return null;
        }

        if (temperature === 0) {
            // Deterministic: always pick the most likely token
            return transitions.reduce((best, current) =>
                current.probability > best.probability ? current : best
            ).token;
        }

        // Apply temperature scaling to probabilities
        const scaledTransitions = transitions.map(({ token, probability, count }) => {
            const scaledProb = Math.pow(probability, 1 / temperature);
            return { token, probability: scaledProb, count };
        });

        // Normalize probabilities
        const totalProb = scaledTransitions.reduce((sum, { probability }) => sum + probability, 1e-10);
        const normalizedTransitions = scaledTransitions.map(({ token, probability, count }) => ({
            token,
            probability: probability / totalProb,
            count
        }));

        // Sample from the adjusted distribution
        const rand = randomFn();
        let cumulativeProb = 0;

        for (const { token, probability } of normalizedTransitions) {
            cumulativeProb += probability;
            if (rand <= cumulativeProb) {
                return token;
            }
        }

        // Fallback
        return normalizedTransitions[normalizedTransitions.length - 1].token;
    }

    /**
     * Update the current state with a new token
     * @param {string} currentState - Current state
     * @param {string} newToken - New token to add
     * @returns {string} - Updated state
     */
    /**
     * Update the current state with a new token
     * @param {string} currentState - The current state
     * @param {string} newToken - The new token
     * @returns {string} - The updated state
     */
    updateState(currentState, newToken) {
        const stateTokens = currentState.split(' ');
        const newStateTokens = [...stateTokens.slice(1), newToken];
        return newStateTokens.join(' ');
    }

    /**
     * Post-process generated tokens into readable text
     * @param {string[]} tokens - Generated tokens
     * @param {Object} options - Processing options
     * @returns {string} - Formatted text
     */
    /**
     * Post-process the generated tokens
     * @param {string[]} tokens - The tokens to process
     * @param {Object} [options={}] - The options to use
     * @returns {string} - The processed text
     */
    postProcess(tokens, options = {}) {
        if (tokens.length === 0) {
            return '';
        }

        let text = tokens.join(' ');

        // Basic punctuation cleanup
        text = text
            // Remove spaces before punctuation
            .replace(/\s+([.!?;:,'")\]}])/g, '$1')
            // Add spaces after punctuation (but not at end)
            .replace(/([.!?;:,])(\w)/g, '$1 $2')
            // Handle quotes and parentheses
            .replace(/\s+(['"])/g, ' $1')
            .replace(/(['"()])\s+/g, '$1 ')
            // Capitalize after sentence endings
            .replace(/([.!?])\s+(\w)/g, (match, punct, letter) => `${punct} ${letter.toUpperCase()}`)
            // Capitalize first letter
            .replace(/^\w/, match => match.toUpperCase())
            // Clean up extra spaces
            .replace(/\s+/g, ' ')
            .trim();

        return text;
    }

    /**
     * Generate multiple text samples.
     * @param {number} count - Number of samples to generate.
     * @param {GenerationContext} context - Generation options (same as generate()).
     * @returns {Array<GenerationResult>} - Array of generation results.
     */
    /**
     * Generate multiple samples
     * @param {number} count - The number of samples to generate
     * @param {GenerationContext} [context=new GenerationContext()] - The generation context
     * @returns {GenerationResult[]} - The generated samples
     */
    generateSamples(count, context = new GenerationContext()) {
        const samples = [];
        for (let i = 0; i < count; i++) {
            try {
                samples.push(this.generate(context));
            } catch (error) {
                samples.push(new GenerationResult('', {
                    error: error.message,
                    model: 'markov',
                    finish_reason: 'error'
                }));
            }
        }
        return samples;
    }
}