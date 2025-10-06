import { FormBuilder } from './form-builder.js';

/**
 * Form builder for enum parameters (select dropdowns)
 */
export class EnumBuilder extends FormBuilder {
  /**
   * Generate HTML for an enum input field (select dropdown)
   * @param {Object} param - Parameter definition from manifest
   * @param {Object} state - Current state object for runtime fallbacks
   * @returns {string} HTML string for the select field
   */
  static generate(param, state = {}) {
    const defaultValue = this.getDefaultValue(param, state);
    const attrs = this.generateCommonAttributes(param);
    
    let html = this.generateLabel(param);
    html += `<select ${attrs}>`;
    
    if (param.enum) {
      for (const option of param.enum) {
        html += `<option value="${this.escapeHtml(String(option))}"`;
        if (defaultValue !== undefined && option === defaultValue) {
          html += ' selected';
        }
        html += `>${this.escapeHtml(String(option))}</option>`;
      }
    }
    
    html += '</select>';
    
    return html;
  }
}