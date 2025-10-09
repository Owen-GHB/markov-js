import { FormBuilder } from './form-builder.js';

/**
 * Form builder for array parameters
 */
export class ArrayBuilder extends FormBuilder {
	/**
	 * Generate HTML for an array input field
	 * @param {Object} param - Parameter definition from manifest
	 * @param {Object} state - Current state object for runtime fallbacks
	 * @returns {string} HTML string for the array input
	 */
	static generate(param, state = {}) {
		const defaultValue = this.getDefaultValue(param, state);
		const attrs = this.generateCommonAttributes(param);

		let html = this.generateLabel(param);

		// For array inputs, we'll use a text input with comma-separated values
		html += `<input type="text" ${attrs}`;

		if (defaultValue && Array.isArray(defaultValue)) {
			// Join array elements with commas for display
			html += ` value="${this.escapeHtml(defaultValue.join(', '))}"`;
		} else if (defaultValue) {
			// If default is a string, use it directly
			html += ` value="${this.escapeHtml(String(defaultValue))}"`;
		}

		html += `>`;

		// Add help text explaining the format
		html += `<div class="array-format-help">Enter values separated by commas (e.g., value1, value2, value3)</div>`;

		return html;
	}
}
