// src/core/TextGenerator.js

/**
 * Text generation engine using Markov models
 * 
 * Features:
 * - Multiple generation strategies (length-based, stop-condition)
 * - Configurable randomness and constraints
 * - Post-processing for readable output
 */
export class TextGenerator {
    /**
     * @param {MarkovModel} model - Trained Markov model
     */
    constructor(model) {
        if (!model) {
            throw new Error('TextGenerator requires a MarkovModel instance');
        }
        this.model = model;
    }

    /**
     * Generate text using the Markov model
     * @param {Object} options - Generation options
     * @param {number} options.maxLength - Maximum number of tokens to generate
     * @param {number} options.minLength - Minimum number of tokens to generate
     * @param {string[]} options.stopTokens - Tokens that end generation
     * @param {string} options.startWith - Specific starting text (optional)
     * @param {number} options.temperature - Randomness factor (0-2, default: 1)
     * @param {Function} options.randomFn - Custom random function
     * @param {boolean} options.allowRepetition - Allow immediate token repetition
     * @returns {Object} - Generated text and metadata
     */
    generate(options = {}) {
        const {
            maxLength = 100,
            minLength = 10,
            stopTokens = ['.', '!', '?'],
            startWith = null,
            temperature = 1.0,
            randomFn = Math.random,
            allowRepetition = true
        } = options;

        if (maxLength < 1) {
            throw new Error('maxLength must be at least 1');
        }

        if (this.model.chains.size === 0) {
            throw new Error('Model has no trained data');
        }

        const generatedTokens = [];
        let currentState = this.initializeState(startWith, randomFn);
        
        if (!currentState) {
            throw new Error('Could not find a valid starting state');
        }

        // Add initial state tokens to output
        const stateTokens = currentState.split(' ');
        generatedTokens.push(...stateTokens);

        let attempts = 0;
        const maxAttempts = maxLength * 3; // Prevent infinite loops

        while (generatedTokens.length < maxLength && attempts < maxAttempts) {
            attempts++;

            const nextToken = this.sampleNextToken(currentState, temperature, randomFn);
            
            if (!nextToken) {
                // No valid transitions, try to find a new starting point
                const newState = this.model.getRandomStartState(randomFn);
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
            if (generatedTokens.length >= minLength && stopTokens.includes(nextToken)) {
                break;
            }

            // Update state for next iteration
            currentState = this.updateState(currentState, nextToken);
        }

        return {
            text: this.postProcess(generatedTokens, options),
            tokens: generatedTokens,
            length: generatedTokens.length,
            finalState: currentState,
            attempts: attempts,
            stoppedEarly: generatedTokens.length < maxLength
        };
    }

    /**
     * Initialize the starting state for generation
     * @param {string|null} startWith - Optional starting text
     * @param {Function} randomFn - Random function
     * @returns {string|null} - Initial state
     */
    initializeState(startWith, randomFn) {
        if (startWith) {
            // Try to find a state that matches the starting text
            const startTokens = startWith.trim().split(/\s+/);
            
            if (startTokens.length >= this.model.order) {
                // Use the last n tokens as the starting state
                const proposedState = startTokens.slice(-this.model.order).join(' ');
                if (this.model.chains.has(proposedState)) {
                    return proposedState;
                }
            }
            
            // Fallback: try to find any state containing the start text
            for (const state of this.model.chains.keys()) {
                if (state.includes(startWith.toLowerCase())) {
                    return state;
                }
            }
        }

        // Use random starting state
        return this.model.getRandomStartState(randomFn);
    }

    /**
     * Sample next token with temperature control
     * @param {string} currentState - Current model state
     * @param {number} temperature - Randomness factor (0-2)
     * @param {Function} randomFn - Random function
     * @returns {string|null} - Next token or null
     */
    sampleNextToken(currentState, temperature, randomFn) {
        const transitions = this.model.getTransitions(currentState);
        
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
        const totalProb = scaledTransitions.reduce((sum, { probability }) => sum + probability, 0);
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
     * Generate multiple text samples
     * @param {number} count - Number of samples to generate
     * @param {Object} options - Generation options (same as generate())
     * @returns {Array} - Array of generation results
     */
    generateSamples(count, options = {}) {
        const samples = [];
        for (let i = 0; i < count; i++) {
            try {
                samples.push(this.generate(options));
            } catch (error) {
                samples.push({
                    error: error.message,
                    text: '',
                    tokens: [],
                    length: 0
                });
            }
        }
        return samples;
    }

    /**
     * Generate text that continues from existing text
     * @param {string} existingText - Text to continue from
     * @param {Object} options - Generation options
     * @returns {Object} - Generation result with continuation
     */
    continueText(existingText, options = {}) {
        const tokens = existingText.trim().split(/\s+/);
        
        if (tokens.length < this.model.order) {
            throw new Error(`Need at least ${this.model.order} tokens to continue text`);
        }

        // Use the last n tokens to determine starting state
        const startState = tokens.slice(-this.model.order).join(' ');
        
        const result = this.generate({
            ...options,
            startWith: tokens.slice(-this.model.order).join(' ')
        });

        return {
            ...result,
            originalText: existingText,
            continuationText: result.text,
            fullText: existingText + ' ' + result.text
        };
    }

    /**
     * Interactive generation with user feedback
     * @param {Object} options - Generation options
     * @param {Function} feedbackFn - Callback for user feedback on each token
     * @returns {Object} - Generation result
     */
    generateInteractive(options = {}, feedbackFn = null) {
        if (!feedbackFn) {
            return this.generate(options);
        }

        // This would be used in CLI for step-by-step generation
        // Implementation would depend on specific interactive requirements
        throw new Error('Interactive generation not yet implemented');
    }
}