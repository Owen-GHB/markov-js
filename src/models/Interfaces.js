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
   * @param {object} options - Generation parameters.
   * @returns {string} Generated text.
   */
  generate(options) {
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
 * Training data container that can hold different data structures
 */
export class TrainingData {
    constructor(tokens, options = {}) {
        this.tokens = tokens;
        this.sequences = options.sequences || null; // For HMM observable sequences
        this.labels = options.labels || null;       // For supervised learning
        this.metadata = options.metadata || {};
        this.preprocessing = options.preprocessing || {};
    }

    // Factory methods for different model types
    static forMarkov(tokens, options = {}) {
        return new TrainingData(tokens, { ...options, type: 'markov' });
    }

    static forHMM(observableSequences, hiddenStates = null, options = {}) {
        return new TrainingData(observableSequences, {
            ...options,
            sequences: observableSequences,
            labels: hiddenStates,
            type: 'hmm'
        });
    }

    static forVLMM(tokens, options = {}) {
        return new TrainingData(tokens, { ...options, type: 'vlmm' });
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
        this.finish_reason = metadata.finish_reason || false;
    }
}