/**
 * Base class for all text generation models.
 * @abstract
 */
export class TextModel {
  /**
   * @param {object} options - The model options.
   */
  constructor(options = {}) {
    if (new.target === TextModel) {
      throw new Error('Cannot instantiate abstract TextModel');
    }
    this.options = options;
  }

  /**
   * Get model-specific capabilities
   * @returns {Object} - Supported features and parameters
   */
  getCapabilities() {
      return {
          supportsTemperature: false,
          supportsConstraints: false,
          supportsConditionalGeneration: false,
          supportsBatchGeneration: false,
          maxOrder: null,
          modelType: this.modelType
      };
  }

  /**
   * @abstract
   * @param {string[]} tokens - Training data.
   */
  train(tokens) {
    throw new Error('train() must be implemented by subclasses');
  }

  /**
   * @abstract
   * @param {GenerationContext} context - Generation parameters.
   * @returns {GenerationResult} Generated text.
   */
  generate(context) {
    throw new Error('generate() must be implemented by subclasses');
  }

  /**
   * @abstract
   * @returns {object} - Serializable model data.
   */
  toJSON() {
    throw new Error('toJSON() must be implemented by subclasses');
  }

  /**
   * @abstract
   * @param {object} data - Serialized model data.
   */
  fromJSON(data) {
    throw new Error('fromJSON() must be implemented by subclasses');
  }

  /**
   * @abstract
   * @returns {object} - Model statistics.
   */
  getStats() {
    throw new Error('getStats() must be implemented by subclasses');
  }
}

/**
 * Generation context for different model types
 */
export class GenerationContext {
    constructor(options = {}) {
        this.max_tokens = options.max_tokens || 100;
        this.min_tokens = options.min_tokens || 10;
        this.temperature = options.temperature || 1.0;
        this.stop = options.stop || ['.', '!', '?'];
        this.prompt = options.prompt || null;
        this.randomFn = options.randomFn;
    }
}

/**
 * Generation result with enhanced metadata
 */
export class GenerationResult {
    constructor(text, metadata = {}) {
        this.text = text;
        this.tokens = metadata.tokens || [];
        this.length = metadata.length || text.split(/\s+/).length;
        this.model = metadata.model || 'unknown';
        this.finish_reason = metadata.finish_reason || 'unknown';
    }
}