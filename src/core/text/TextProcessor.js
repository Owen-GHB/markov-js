import { Tokenizers, Normalizers } from './TokenizationService.js';

/**
 * Text preprocessing and tokenization utilities
 */
export class TextProcessor {
    constructor() {
        // Default preprocessing pipeline
        this.defaultFilters = [
            this.normalizeWhitespace,
            this.handlePunctuation
        ];
    }

    /**
     * Main tokenization method with configurable preprocessing
     * @param {string} text - Raw input text
     * @param {Object} options - Tokenization options
     * @param {string} options.method - Tokenization method ('whitespace', 'word', 'sentence')
     * @param {boolean} options.preservePunctuation - Keep punctuation as separate tokens
     * @param {boolean} options.preserveCase - Maintain original casing
     * @param {Function[]} options.customFilters - Additional preprocessing filters
     * @returns {string[]} - Array of tokens
     */
    tokenize(text, options = {}) {
        const {
            method = 'word',
            preservePunctuation = true,
            preserveCase = true,
            customFilters = []
        } = options;

        if (!text || typeof text !== 'string' || text.trim().length === 0) {
            throw new Error('Input text must be a non-empty string.');
        }

        // Apply preprocessing filters
        const filters = [...this.defaultFilters, ...customFilters];
        let processedText = text;
        
        for (const filter of filters) {
            processedText = filter.call(this, processedText, options);
        }

        // Tokenize based on method
        let tokens;
        switch (method.toLowerCase()) {
            case 'whitespace':
                tokens = this.tokenizeByWhitespace(processedText);
                break;
            case 'word':
                tokens = this.tokenizeByWord(processedText, preservePunctuation);
                break;
            case 'sentence':
                tokens = this.tokenizeBySentence(processedText);
                break;
            default:
                throw new Error(`Unknown tokenization method: ${method}`);
        }

        // Case normalization
        if (!preserveCase) {
            tokens = tokens.map(token => token.toLowerCase());
        }

        return tokens.filter(token => token.length > 0);
    }

    /**
     * Simple whitespace-based tokenization
     * @param {string} text - Input text
     * @returns {string[]} - Tokens split by whitespace
     */
    tokenizeByWhitespace(text) {
        return text.split(/\s+/);
    }

    /**
     * Word-based tokenization with optional punctuation handling
     * @param {string} text - Input text
     * @param {boolean} preservePunctuation - Whether to keep punctuation as separate tokens
     * @returns {string[]} - Word tokens
     */
    tokenizeByWord(text, preservePunctuation = true) {
        if (preservePunctuation) {
            return Tokenizers.word(text);
        } else {
            // Extract only word characters
            return text.match(/\w+/g) || [];
        }
    }

    /**
     * Sentence-based tokenization
     * @param {string} text - Input text
     * @returns {string[]} - Sentence tokens
     */
    tokenizeBySentence(text) {
        return text.split(/(?<!\w\.\w.)(?<![A-Z][a-z]\.)(?<=\.|\?|\!)\s+/)
            .map(s => s.trim())
            .filter(s => s.length > 0);
    }

    /**
     * Normalize whitespace characters
     * @param {string} text - Input text
     * @returns {string} - Text with normalized whitespace
     */
    normalizeWhitespace(text) {
        return Normalizers.whitespace(text);
    }

    /**
     * Handle punctuation - can be customized for different behaviors
     * @param {string} text - Input text
     * @param {Object} options - Processing options
     * @returns {string} - Processed text
     */
    handlePunctuation(text, options = {}) {
        // Add spaces around punctuation for better tokenization
        // This ensures punctuation becomes separate tokens
        if (options.preservePunctuation !== false) {
            text = text.replace(/([.!?;:,'"()[\]{}])/g, ' $1 ');
        }
        return text;
    }

    /**
     * Check if a token represents the end of a sentence.
     * @param {string} token - Token to check.
     * @returns {boolean} - True if token is sentence-ending punctuation.
     */
    isSentenceEnd(token) {
        return /^[.!?]+['"]?$/.test(token);
    }

    /**
     * Get statistics about tokenized text.
     * @param {string[]} tokens - Array of tokens.
     * @returns {Object} - Token statistics.
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