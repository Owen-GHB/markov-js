import { ParserUtils } from './Utils.js';
import { manifest } from '../../contract.js';

/**
 * Parse a command in function style
 * @param {string[]} match - Destructured match from regex
 * @param {Object} context - Optional context with runtime state
 * @returns {{error: string|null, command: Object|null}}
 */
export function parseFunctionStyle([, name, argsString], context = {}) {
	const commandName = name.toLowerCase();

	// Find the command in manifest
	const command = manifest.commands.find(
		(cmd) => cmd.name.toLowerCase() === commandName,
	);
	if (!command) {
		return {
			error: `Unknown command: ${name}`,
			command: null,
		};
	}

	const parameters = command.parameters || [];
	const requiredParams = parameters.filter((p) => p.required);
	const optionalParams = parameters.filter((p) => !p.required);

	let args = {};
	const argPairs = argsString
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean);

	let positionalIndex = 0;

	// Process arguments
	for (const argPair of argPairs) {
		if (argPair.includes('=')) {
			// Named parameter: key=value
			const [key, valueStr] = argPair.split('=', 2).map((s) => s.trim());
			if (!key || !valueStr) {
				return {
					error: `Invalid named parameter: ${argPair}`,
					command: null,
				};
			}

			// Validate parameter exists
			const param = parameters.find(
				(p) => p.name.toLowerCase() === key.toLowerCase(),
			);
			if (!param) {
				return {
					error: `Unknown parameter: ${key}`,
					command: null,
				};
			}

			args[param.name] = ParserUtils.normalizeValue(valueStr);
		} else {
			// Positional parameter
			if (positionalIndex >= requiredParams.length) {
				return {
					error: `Unexpected positional parameter: ${argPair}. All required parameters already provided.`,
					command: null,
				};
			}

			const param = requiredParams[positionalIndex];
			args[param.name] = ParserUtils.normalizeValue(argPair);
			positionalIndex++;
		}
	}

	// Check for missing required parameters after applying runtime fallbacks
	const missingParams = [];
	for (const param of requiredParams) {
		if (!(param.name in args)) {
			// Try to apply runtime fallback
			if (param.runtimeFallback && context && context.state && context.state.has(param.runtimeFallback)) {
				args[param.name] = context.state.get(param.runtimeFallback);
			} else {
				missingParams.push(param.name);
			}
		}
	}

	if (missingParams.length > 0) {
		return {
			error: `Missing required parameters: ${missingParams.join(',')}`,
			command: null,
		};
	}

	// Apply defaults
	for (const param of optionalParams) {
		if (!(param.name in args) && param.default !== undefined) {
			args[param.name] = param.default;
		}
	}

	// Validate arguments against manifest specs
	for (const param of parameters) {
		const value = args[param.name];
		if (value === undefined && !param.required) continue;

		// Type validation for union types
		const types = param.type.split('|').map((t) => t.trim());
		let parsedValue = value;
		let typeValidationPassed = false;

		// Try each type in the union until one succeeds
		for (const type of types) {
			try {
				if (type === 'integer') {
					const intValue = parseInt(value, 10);
					if (!isNaN(intValue)) {
						parsedValue = intValue;
						typeValidationPassed = true;
						break;
					}
				} else if (type === 'number') {
					const numValue = parseFloat(value);
					if (!isNaN(numValue)) {
						parsedValue = numValue;
						typeValidationPassed = true;
						break;
					}
				} else if (type === 'boolean') {
					if (typeof value === 'boolean') {
						parsedValue = value;
						typeValidationPassed = true;
						break;
					} else {
						const lowerValue = value.toLowerCase();
						if (lowerValue === 'true') {
							parsedValue = true;
							typeValidationPassed = true;
							break;
						} else if (lowerValue === 'false') {
							parsedValue = false;
							typeValidationPassed = true;
							break;
						}
					}
				} else if (type === 'array') {
					if (Array.isArray(value)) {
						parsedValue = value;
						typeValidationPassed = true;
						break;
					} else {
						try {
							const arrayValue = JSON.parse(value);
							if (Array.isArray(arrayValue)) {
								parsedValue = arrayValue;
								typeValidationPassed = true;
								break;
							}
						} catch {
							// Continue to next type
						}
					}
				} else if (type === 'string') {
					// Strings are always valid (everything can be treated as a string)
					parsedValue = String(value);
					typeValidationPassed = true;
					break;
				}
			} catch {
				// Continue to next type if this one fails
				continue;
			}
		}

		// If no type validation passed, return error
		if (!typeValidationPassed) {
			return {
				error: `Parameter ${param.name} must be of type: ${param.type}`,
				command: null,
			};
		}

		// Update args with parsed value
		args[param.name] = parsedValue;

		// Range validation for numbers
		if (types.includes('integer') || types.includes('number')) {
			if (param.min !== undefined && parsedValue < param.min) {
				return {
					error: `Parameter ${param.name} must be at least ${param.min}`,
					command: null,
				};
			}
			if (param.max !== undefined && parsedValue > param.max) {
				return {
					error: `Parameter ${param.name} must be at most ${param.max}`,
					command: null,
				};
			}
		}

		// Enum validation
		if (param.enum && !param.enum.includes(parsedValue)) {
			return {
				error: `Parameter ${param.name} must be one of: ${param.enum.join(', ')}`,
				command: null,
			};
		}
	}

	return {
		error: null,
		command: {
			name: command.name,
			args,
		},
	};
}
