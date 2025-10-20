// File: processor/Evaluator.js

/**
 * Handles template evaluation with support for:
 * - {{input}}, {{input.param}}, {{output}}, {{output.property}}, {{state.key}}
 * - Nested property access
 * - Multiple context sources
 */
export class Evaluator {
	/**
	 * Template handler
	 * Supports: {{input}}, {{input.param}}, {{output}}, {{output.property}}, {{state.key}}
	 */
	static evaluateTemplate(template, contexts = {}) {
		const { input = {}, output = {}, state = new Map() } = contexts;
		return template.replace(/\{\{([^{}]+)\}\}/g, (_, expression) => {
			const trimmed = expression.trim();

			// Handle nested property access (input.param, output.property, state.key)
			if (trimmed.includes('.')) {
				const [contextName, ...pathParts] = trimmed.split('.');
				const path = pathParts.join('.');

				let context;
				switch (contextName) {
					case 'input':
						context = input;
						break;
					case 'output':
						context = output;
						break;
					case 'state':
						context = state;
						break;
					default:
						return ''; // Unknown context
				}

				// Navigate the object path
				const value = this.getNestedValue(context, path);
				return value !== undefined ? String(value) : '';
			}

			// Handle direct context references (input, output)
			switch (trimmed) {
				case 'input':
					return JSON.stringify(input);
				case 'output':
					return JSON.stringify(output);
				default:
					// Fallback to original behavior for simple values
					let val = input[trimmed] || output[trimmed];
					if (val === undefined && state.has && state.has(trimmed)) {
						val = state.get(trimmed);
					} else if (val === undefined && state[trimmed] !== undefined) {
						val = state[trimmed];
					}
					return val !== undefined ? String(val) : '';
			}
		});
	}

	/**
	 * Helper to get nested object values by path
	 */
	static getNestedValue(obj, path) {
		return path.split('.').reduce((current, key) => {
			// Handle Map objects
			if (current instanceof Map) {
				return current.get(key);
			}
			// Handle regular objects
			return current && current[key] !== undefined ? current[key] : undefined;
		}, obj);
	}

	/**
	 * Evaluate conditional expressions with template resolution
	 * Supports: ==, !=, >, <
	 * Malformed expressions return false (safe fallthrough)
	 */
	static evaluateConditional(expression, contexts = {}) {
		try {
			// Resolve templates first
			const resolvedExpression = this.evaluateTemplate(expression, contexts);

			// Find the first matching operator
			const operators = ['==', '!=', '>', '<'];
			let foundOperator = null;

			for (const op of operators) {
				if (resolvedExpression.includes(op)) {
					foundOperator = op;
					break;
				}
			}

			// If no operator found, treat as truthy check
			if (!foundOperator) {
				const expr = this.normalizeConditionalValue(resolvedExpression);
				return Boolean(expr);
			}

			// Split into left and right parts
			const [leftStr, rightStr] = resolvedExpression
				.split(foundOperator)
				.map((part) => part.trim());

			if (!leftStr || !rightStr) {
				return false; // Malformed expression
			}

			// Let JavaScript handle type coercion
			const left = this.normalizeConditionalValue(leftStr);
			const right = this.normalizeConditionalValue(rightStr);

			// Evaluate based on operator
			switch (foundOperator) {
				case '==':
					return left == right; // Intentional loose equality
				case '!=':
					return left != right; // Intentional loose equality
				case '>':
					return left > right;
				case '<':
					return left < right;
				default:
					return false; // Unknown operator
			}
		} catch (error) {
			// Any error during evaluation = false (safe fallthrough)
			return false;
		}
	}

	/**
	 * Normalize values for conditional evaluation
	 * Attempts to convert to numbers/booleans, falls back to strings
	 */
	static normalizeConditionalValue(value) {
		// Handle numeric values
		if (/^-?\d+$/.test(value)) {
			return parseInt(value, 10);
		}
		if (/^-?\d+\.\d+$/.test(value)) {
			return parseFloat(value);
		}

		// Handle booleans
		if (value.toLowerCase() === 'true') return true;
		if (value.toLowerCase() === 'false') return false;
		if (value.toLowerCase() === 'null') return null;
		if (value.toLowerCase() === 'undefined') return undefined;

		// Return as string
		return value;
	}
}
