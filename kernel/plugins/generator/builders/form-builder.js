/**
 * Base class for form builders
 * Provides common functionality for all form builders
 */
export class FormBuilder {
  /**
   * Escape HTML special characters to prevent XSS
   * @param {string} str - String to escape
   * @returns {string} Escaped string
   */
  static escapeHtml(str) {
    if (typeof str !== 'string') return String(str);
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  }

  /**
   * Generate a label element for a parameter
   * @param {Object} param - Parameter definition from manifest
   * @returns {string} HTML label element
   */
  static generateLabel(param) {
    const escapedName = this.escapeHtml(param.name);
    const escapedDescription = this.escapeHtml(param.description || '');
    
    return `<label for="${escapedName}">
      ${escapedName}${param.required ? ' *' : ''}
      ${escapedDescription ? `<span class="param-description">${escapedDescription}</span>` : ''}
    </label>`;
  }

  /**
   * Generate common attributes for input elements
   * @param {Object} param - Parameter definition from manifest
   * @returns {string} String of HTML attributes
   */
  static generateCommonAttributes(param) {
    const escapedName = this.escapeHtml(param.name);
    let attrs = `name="${escapedName}" id="${escapedName}" data-param-name="${escapedName}"`;
    
    if (param.required) {
      attrs += ' required';
    }
    
    if (param.description) {
      attrs += ` title="${this.escapeHtml(param.description)}"`;
    }
    
    return attrs;
  }

  /**
   * Apply runtime fallback value from state if available
   * @param {Object} param - Parameter definition
   * @param {Object} state - Current state object
   * @returns {any} Fallback value or undefined
   */
  static applyRuntimeFallback(param, state) {
    if (param.runtimeFallback && state && state[param.runtimeFallback] !== undefined) {
      return state[param.runtimeFallback];
    }
    return undefined;
  }

  /**
   * Get default value for a parameter
   * @param {Object} param - Parameter definition
   * @param {Object} state - Current state object
   * @returns {any} Default value
   */
  static getDefaultValue(param, state) {
    // First check for runtime fallback
    const fallbackValue = this.applyRuntimeFallback(param, state);
    if (fallbackValue !== undefined) {
      return fallbackValue;
    }
    
    // Otherwise use default from manifest
    if (param.default !== undefined) {
      return param.default;
    }
    
    return undefined;
  }
}