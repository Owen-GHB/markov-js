import { FormBuilder } from './form-builder.js';

/**
 * Form builder for union type parameters
 * Union types like "string|integer" are handled by generating an appropriate input
 */
export class UnionBuilder extends FormBuilder {
	/**
	 * Generate HTML for a union type input field
	 * @param {Object} param - Parameter definition from manifest
	 * @param {Object} state - Current state object for runtime fallbacks
	 * @returns {string} HTML string for the input field
	 */
	static generate(param, state = {}) {
		const defaultValue = this.getDefaultValue(param, state);
		const attrs = this.generateCommonAttributes(param);

		let html = this.generateLabel(param);

		// Check if we have a union type (contains | character)
		if (param.type && param.type.includes('|')) {
			const types = param.type.split('|').map((t) => t.trim().toLowerCase());

			// For now, use a text input since we don't know the runtime type
			// In the future, this could be enhanced to provide multiple input fields
			html += `<input type="text" ${attrs}`;

			if (defaultValue !== undefined) {
				html += ` value="${this.escapeHtml(String(defaultValue))}"`;
			}

			html += `>`;

			// Add type information as help text
			html += `<div class="union-type-help">Accepts: ${types.join(', ')}</div>`;
		} else {
			// If not a union, treat as a regular type
			let inputType = 'text';
			if (param.type === 'integer' || param.type === 'number') {
				inputType = 'number';
			} else if (param.type === 'boolean') {
				inputType = 'checkbox';
			}

			html += `<input type="${inputType}" ${attrs}`;

			if (defaultValue !== undefined) {
				html += ` value="${this.escapeHtml(String(defaultValue))}"`;
			}

			html += `>`;
		}

		return html;
	}
}
