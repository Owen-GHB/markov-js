import { FormBuilder } from './form-builder.js';

/**
 * Form builder for string parameters
 */
export class StringBuilder extends FormBuilder {
  /**
   * Generate HTML for a string input field
   * @param {Object} param - Parameter definition from manifest
   * @param {Object} state - Current state object for runtime fallbacks
   * @returns {string} HTML string for the input field
   */
  static generate(param, state = {}) {
    const defaultValue = this.getDefaultValue(param, state);
    const escapedDefaultValue = defaultValue !== undefined ? this.escapeHtml(String(defaultValue)) : '';
    const attrs = this.generateCommonAttributes(param);
    
    let html = this.generateLabel(param);
    
    if (param.description && param.description.length > 100) {
      // For longer descriptions, use a textarea
      html += `<textarea ${attrs}`;
      if (escapedDefaultValue) {
        html += `>${escapedDefaultValue}</textarea>`;
      } else {
        html += `></textarea>`;
      }
    } else {
      // For shorter text, use a text input field
      html += `<input type="text" ${attrs}`;
      if (escapedDefaultValue) {
        html += ` value="${escapedDefaultValue}"`;
      }
      html += '>';
    }
    
    return html;
  }
}