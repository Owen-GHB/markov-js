import { FormBuilder } from './form-builder.js';

/**
 * Form builder for number and integer parameters
 */
export class NumberBuilder extends FormBuilder {
  /**
   * Generate HTML for a number input field
   * @param {Object} param - Parameter definition from manifest
   * @param {Object} state - Current state object for runtime fallbacks
   * @returns {string} HTML string for the input field
   */
  static generate(param, state = {}) {
    const defaultValue = this.getDefaultValue(param, state);
    const attrs = this.generateCommonAttributes(param);
    
    let html = this.generateLabel(param);
    html += `<input type="number" ${attrs}`;
    
    // Add min/max/step based on parameter definition
    if (param.min !== undefined) {
      html += ` min="${param.min}"`;
    }
    if (param.max !== undefined) {
      html += ` max="${param.max}"`;
    }
    
    // For integer type, set step to 1
    if (param.type === 'integer' || (param.type && param.type.includes('integer'))) {
      html += ' step="1"';
    }
    
    if (defaultValue !== undefined) {
      html += ` value="${defaultValue}"`;
    }
    
    html += '>';
    
    // Add validation message if min/max are defined
    if (param.min !== undefined || param.max !== undefined) {
      const minText = param.min !== undefined ? `Minimum: ${param.min}` : '';
      const maxText = param.max !== undefined ? `Maximum: ${param.max}` : '';
      const separator = param.min !== undefined && param.max !== undefined ? ', ' : '';
      if (minText || maxText) {
        html += `<div class="validation-info">${minText}${separator}${maxText}</div>`;
      }
    }
    
    return html;
  }
}