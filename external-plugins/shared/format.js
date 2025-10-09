// File: processor\format.js

/**
 * Format command output results into human-readable strings
 * Used by transports that want basic text formatting (CLI, REPL, etc.)
 * Transports can opt-out by setting formatToString=false and handle their own formatting
 */

/**
 * Format a command output result into a human-readable string
 * @param {*} output - The output to format (any type)
 * @returns {string} - Formatted string representation
 */
export function formatResult(output) {
	// Handle primitive types and null/undefined
	if (output === null) {
		return 'null';
	}

	if (output === undefined) {
		return 'undefined';
	}

	if (typeof output === 'string') {
		return output;
	}

	if (typeof output === 'number' || typeof output === 'boolean') {
		return String(output);
	}

	// Handle arrays and objects with clean, human-friendly formatting
	if (typeof output === 'object') {
		return formatObject(output);
	}

	// Catch-all for any other types
	return String(output);
}

/**
 * Format objects and arrays with clean, human-readable indentation
 * @param {Object|Array} obj - The object or array to format
 * @param {number} indentLevel - Current indentation level (internal use)
 * @returns {string} - Formatted string
 */
function formatObject(obj, indentLevel = 0) {
	const indent = '  '.repeat(indentLevel);

	if (Array.isArray(obj)) {
		return formatArray(obj, indentLevel);
	}

	// Handle plain objects
	const entries = Object.entries(obj);

	if (entries.length === 0) {
		return '';
	}

	const formattedEntries = entries.map(([key, value]) => {
		return `${indent}${key}: ${formatValue(value, indentLevel + 1)}`;
	});

	return formattedEntries.join('\n');
}

/**
 * Format arrays with clean, human-readable indentation
 * @param {Array} array - The array to format
 * @param {number} indentLevel - Current indentation level
 * @returns {string} - Formatted string
 */
function formatArray(array, indentLevel = 0) {
	const indent = '  '.repeat(indentLevel);

	if (array.length === 0) {
		return '';
	}

	const formattedItems = array.map((item) => {
		return `${indent}  ${formatValue(item, indentLevel + 1)}`;
	});

	return formattedItems.join('\n');
}

/**
 * Format a single value with appropriate indentation
 * @param {*} value - The value to format
 * @param {number} indentLevel - Current indentation level
 * @returns {string} - Formatted value
 */
function formatValue(value, indentLevel) {
	if (value === null) return 'null';
	if (value === undefined) return 'undefined';

	if (typeof value === 'string') {
		return value;
	}

	if (typeof value === 'number' || typeof value === 'boolean') {
		return String(value);
	}

	if (typeof value === 'object') {
		// For nested objects/arrays, format with proper indentation
		if (Array.isArray(value)) {
			return `\n${formatArray(value, indentLevel)}`;
		}
		return `\n${formatObject(value, indentLevel)}`;
	}

	return String(value);
}
