import { Tokenizer } from './Tokenizer.js';

/**
 * Handles text preprocessing and postprocessing operations
 */
export class TextProcessor {
    constructor() {
        this.tokenizer = new Tokenizer();
    }

    /**
     * Tokenize text (delegates to Tokenizer)
     * @param {string} text - Input text
     * @param {Object} options - Tokenization options
     * @returns {string[]} Array of tokens
     */
    tokenize(text, options = {}) {
        return this.tokenizer.tokenize(text, options);
    }

    /**
     * Get statistics about tokenized text
     * @param {string[]} tokens - Array of tokens
     * @returns {Object} Token statistics
     */
    getTokenStats(tokens) {
        const wordTokens = tokens.filter(token => /\w/.test(token));
        const punctTokens = tokens.filter(token => /^[^\w\s]+$/.test(token));
        const uniqueTokens = new Set(tokens);
        
        return {
            totalTokens: tokens.length,
            wordTokens: wordTokens.length,
            punctuationTokens: punctTokens.length,
            uniqueTokens: uniqueTokens.size,
            avgTokenLength: tokens.reduce((sum, token) => sum + token.length, 0) / tokens.length,
            vocabularyDiversity: uniqueTokens.size / tokens.length
        };
    }
}