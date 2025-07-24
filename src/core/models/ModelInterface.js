/**
 * Base class for all text generation models
 * @abstract
 */
export class TextModel {
  constructor(order) {
    if (new.target === TextModel) {
      throw new Error('Cannot instantiate abstract TextModel');
    }
    this.order = order;
  }

  /**
   * @abstract
   * @param {string[]} tokens - Training data
   */
  train(tokens) {
    throw new Error('train() must be implemented by subclasses');
  }

  /**
   * @abstract
   * @param {object} options - Generation parameters
   * @returns {string} Generated text
   */
  generate(options) {
    throw new Error('generate() must be implemented by subclasses');
  }

  /**
   * @abstract
   * @returns {object} - Serializable model data
   */
  toJSON() {
    throw new Error('toJSON() must be implemented by subclasses');
  }

  /**
   * @abstract
   * @param {object} data - Serialized model data
   */
  fromJSON(data) {
    throw new Error('fromJSON() must be implemented by subclasses');
  }

  /**
   * @abstract
   * @returns {object} - Model statistics
   */
  getStats() {
    throw new Error('getStats() must be implemented by subclasses');
  }
}
