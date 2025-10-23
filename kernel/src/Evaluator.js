// File: processor/Evaluator.js

/**
 * Handles template evaluation with support for:
 * - {{input}}, {{input.param}}, {{output}}, {{output.property}}, {{state.key}}
 * - Nested property access
 * - Multiple context sources
 * - Raw value return for single interpolations (parameter resolution)
 * - String return for multiple interpolations (display templates)
 */
export class Evaluator {
	/**
	 * Template handler
	 * Supports: {{input}}, {{input.param}}, {{output}}, {{output.property}}, {{state.key}}
	 * Returns RAW VALUES for single interpolations, STRINGS for multiple interpolations
	 */
	static evaluateTemplate(template, contexts = {}) {
		// If template is exactly one interpolation with no other text, return raw value
		const singleMatch = template.match(/^\{\{([^{}]+)\}\}$/);
		if (singleMatch) {
			const expression = singleMatch[1].trim();
			return this.getRawValue(expression, contexts);
		}
		
		// Otherwise, do string interpolation (existing logic)
		return template.replace(/\{\{([^{}]+)\}\}/g, (_, expression) => {
			const trimmed = expression.trim();

			// Use the same flexible logic for both nested and simple properties
			const rawValue = this.getRawValue(trimmed, contexts);
			if (rawValue === undefined) {
				return '';
			}
			
			// Convert to string for display
			if (typeof rawValue === 'object' && rawValue !== null) {
				return JSON.stringify(rawValue);
			}
			return String(rawValue);
		});
	}

	/**
	 * Get raw value from context (no string conversion)
	 * Used for parameter resolution in chains
	 */
	static getRawValue(expression, contexts = {}) {
		// Handle nested property access (original.length, output.data, etc.)
		if (expression.includes('.')) {
			const [contextName, ...pathParts] = expression.split('.');
			const path = pathParts.join('.');
			
			// Get the context object by name - support ANY context
			const context = contexts[contextName];
			if (context === undefined) {
				return undefined; // Unknown context
			}
			
			// Navigate the object path and return raw value
			return this.getNestedValue(context, path);
		}
		
		// Handle direct context references (input, output, original, etc.)
		// First check if it's a direct context reference
		if (contexts[expression] !== undefined) {
			return contexts[expression];
		}
		
		// Fallback: check all context properties for this key
		for (const contextName in contexts) {
			const context = contexts[contextName];
			if (context && typeof context === 'object' && context[expression] !== undefined) {
				return context[expression];
			}
		}
		
		return undefined;
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
