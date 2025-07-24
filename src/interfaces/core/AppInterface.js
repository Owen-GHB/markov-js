/**
 * Stateless interface core.
 */
export class AppInterface {
  /**
   * @param {TextModel} model - Pre-initialized model instance.
   * @param {TextGenerator} generator
   */
  constructor(model, generator) {
    this.model = model;
    this.generator = generator;
  }

  /**
   * @returns {ModelStats} - Immutable stats object.
   */
  getStats() {
    return this.model.getStats();
  }
}
