/**
 * Handles all text tokenization operations
 */
export class Tokenizer {
    constructor() {
        this.sentenceEndings = new Set(['.', '!', '?']);
    }

    /**
     * Main tokenization method
     * @param {string} text - Input text
     * @param {Object} options - Tokenization options
     * @param {string} [options.method='word'] - 'word', 'whitespace', or 'sentence'
     * @param {boolean} [options.preservePunctuation=true] - Keep punctuation as separate tokens
     * @param {boolean} [options.preserveCase=true] - Maintain original casing
     * @returns {string[]} Array of tokens
     */
    tokenize(text, options = {}) {
        if (!text || typeof text !== 'string') {
            throw new Error('Input text must be a non-empty string.');
        }

        const {
            method = 'word',
            preservePunctuation = true,
            preserveCase = true
        } = options;

        // Pre-process text
        let processedText = this.normalizeWhitespace(text);
        if (preservePunctuation) {
            processedText = this.handlePunctuation(processedText);
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
     * @returns {string[]} Tokens split by whitespace
     */
    tokenizeByWhitespace(text) {
        return text.split(/\s+/);
    }

    /**
     * Word-based tokenization with optional punctuation handling
     * @param {string} text - Input text
     * @param {boolean} preservePunctuation - Whether to keep punctuation as separate tokens
     * @returns {string[]} Word tokens
     */
    tokenizeByWord(text, preservePunctuation = true) {
        if (preservePunctuation) {
            return text.match(/\w+|[^\w\s]/g) || [];
        }
        return text.match(/\w+/g) || [];
    }

    /**
     * Sentence-based tokenization
     * @param {string} text - Input text
     * @returns {string[]} Sentence tokens
     */
    tokenizeBySentence(text) {
        return text.split(/(?<!\w\.\w.)(?<![A-Z][a-z]\.)(?<=\.|\?|\!)\s+/)
            .map(s => s.trim())
            .filter(s => s.length > 0);
    }

    /**
     * Normalize whitespace characters
     * @param {string} text - Input text
     * @returns {string} Text with normalized whitespace
     */
    normalizeWhitespace(text) {
        return text.replace(/\s+/g, ' ').trim();
    }

    /**
     * Handle punctuation - adds spaces around punctuation for better tokenization
     * @param {string} text - Input text
     * @returns {string} Processed text
     */
    handlePunctuation(text) {
        return text.replace(/([.!?;:,'"()[\]{}])/g, ' $1 ');
    }

    /**
     * Check if token represents sentence end
     * @param {string} token - Token to check
     * @returns {boolean} True if token is sentence-ending punctuation
     */
    isSentenceEnd(token) {
        return this.sentenceEndings.has(token);
    }
}