/**
 * @namespace Tokenizers
 */
export const Tokenizers = {
  /**
   * @param {string} text
   */
  word: (text) => text.match(/\w+|[^\w\s]/g) || []
};

/**
 * @namespace Normalizers
 */
export class Normalizers {
  /**
   * @param {string} text
   */
  static whitespace(text) {
    return text.replace(/\s+/g, ' ').trim();
  }
}
