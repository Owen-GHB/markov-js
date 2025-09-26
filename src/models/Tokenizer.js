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
	/**
	 * Tokenize text based on the provided options
	 * @param {string} text - The text to tokenize
	 * @param {Object} [options={}] - The tokenization options
	 * @returns {string[]} - The array of tokens
	 */
	tokenize(text, options = {}) {
		if (!text || typeof text !== 'string') {
			throw new Error('Input text must be a non-empty string.');
		}

		const {
			method = 'word',
			preservePunctuation = true,
			preserveCase = true,
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
			tokens = tokens.map((token) => token.toLowerCase());
		}

		return tokens.filter((token) => token.length > 0);
	}

	/**
	 * Simple whitespace-based tokenization
	 * @param {string} text - Input text
	 * @returns {string[]} Tokens split by whitespace
	 */
	/**
	 * Tokenize text by whitespace
	 * @param {string} text - The text to tokenize
	 * @returns {string[]} - The array of tokens
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
	/**
	 * Tokenize text by word
	 * @param {string} text - The text to tokenize
	 * @param {boolean} [preservePunctuation=true] - Whether to preserve punctuation
	 * @returns {string[]} - The array of tokens
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
	/**
	 * Tokenize text by sentence
	 * @param {string} text - The text to tokenize
	 * @returns {string[]} - The array of sentences
	 */
	tokenizeBySentence(text) {
		return text
			.split(/(?<!\w\.\w.)(?<![A-Z][a-z]\.)(?<=\.|\?|\!)\s+/)
			.map((s) => s.trim())
			.filter((s) => s.length > 0);
	}

	/**
	 * Normalize whitespace characters
	 * @param {string} text - Input text
	 * @returns {string} Text with normalized whitespace
	 */
	/**
	 * Normalize whitespace in text
	 * @param {string} text - The text to normalize
	 * @returns {string} - The normalized text
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

	/**
	 * New method: Tokenize into sentences of words
	 * @param {string} text - Input text
	 * @param {Object} options - Tokenization options
	 * @returns {string[][]} Array of sentences, each sentence is array of words
	 */
	tokenizeIntoSentences(text, options = {}) {
		if (!text || typeof text !== 'string') {
			return [[]]; // Empty training set format
		}

		const { preservePunctuation = true, preserveCase = true } = options;

		// Get sentences
		const sentences = this.tokenizeBySentence(text);

		// Process each sentence into words
		const result = sentences.map((sentence) => {
			let processed = this.normalizeWhitespace(sentence);
			if (preservePunctuation) {
				processed = this.handlePunctuation(processed);
			}

			const words = preservePunctuation
				? processed.match(/\w+|[^\w\s]/g) || []
				: processed.match(/\w+/g) || [];

			return preserveCase ? words : words.map((w) => w.toLowerCase());
		});

		// Ensure we always return at least [[]] for empty input
		return result.length > 0 ? result : [[]];
	}
}
