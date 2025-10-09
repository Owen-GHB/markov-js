import { FormBuilder } from './form-builder.js';

/**
 * Form builder for boolean parameters
 */
export class BooleanBuilder extends FormBuilder {
	/**
	 * Generate HTML for a boolean input field (checkbox)
	 * @param {Object} param - Parameter definition from manifest
	 * @param {Object} state - Current state object for runtime fallbacks
	 * @returns {string} HTML string for the input field
	 */
	static generate(param, state = {}) {
		const defaultValue = this.getDefaultValue(param, state);
		const attrs = this.generateCommonAttributes(param);

		let html = this.generateLabel(param);
		html += `<input type="checkbox" ${attrs}`;

		// For checkboxes, checked attribute determines state
		if (defaultValue) {
			html += ' checked';
		}

		html += `>`;

		return html;
	}
}
