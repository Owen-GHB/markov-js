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

    /**
     * Post-process generated tokens into readable text
     * @param {string[]} tokens - Generated tokens
     * @param {Object} options - Processing options
     * @returns {string} Formatted text
     */
    postProcess(tokens, options = {}) {
        if (tokens.length === 0) return '';

        let text = tokens.join(' ');

        // Basic punctuation cleanup
        text = text
            .replace(/\s+([.!?;:,'")\]}])/g, '$1')
            .replace(/([.!?;:,])(\w)/g, '$1 $2')
            .replace(/\s+(['"])/g, ' $1')
            .replace(/(['"()])\s+/g, '$1 ')
            .replace(/([.!?])\s+(\w)/g, (_, punct, letter) => `${punct} ${letter.toUpperCase()}`)
            .replace(/^\w/, match => match.toUpperCase())
            .replace(/\s+/g, ' ')
            .trim();

        return text;
    }
}