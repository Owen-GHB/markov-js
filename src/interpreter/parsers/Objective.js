import { ParserUtils } from './Utils.js';
import manifest from '../../manifest.json' with { type: 'json' }; // Explicit JSON import

/**
 * Parse a command in object style (e.g., "train({file: 'sample.txt', modelType: 'markov'})")
 * @param {string[]} match - Destructured match from regex
 * @param {Object} context - Optional context with runtime state
 * @returns {{error: string|null, command: Object|null}}
 */
export function parseObjectStyle([, name, argsString], context = {}) {
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

	let args;
	try {
		// Try parsing as JSON
		args = JSON.parse(argsString);
	} catch (e) {
		try {
			// Fallback: Convert JS object literal to JSON (add quotes around keys)
			const wrappedArgsString = argsString.replace(
				/([{,]\s*)([a-zA-Z_$][\w$]*)(\s*:)/g,
				'$1"$2"$3',
			);
			args = JSON.parse(wrappedArgsString);
		} catch (fallbackError) {
			return {
				error: `Invalid object syntax: ${argsString}`,
				command: null,
			};
		}
	}

	// Handle non-object inputs for parameters with transform rules
	if (typeof args !== 'object' || args === null) {
		const singleParam = parameters.find((p) => p.required && p.transform);
		if (singleParam) {
			const types = singleParam.type.split('|').map((t) => t.trim());
			let parsedValue = args;

			// Validate and parse type
			if (types.includes('integer') && !isNaN(parseInt(args, 10))) {
				parsedValue = parseInt(args, 10);
			} else if (types.includes('string')) {
				parsedValue = String(args);
			} else {
				return {
					error: `Parameter ${singleParam.name} must be ${singleParam.type}`,
					command: null,
				};
			}

			// Apply transform rule from manifest
			if (singleParam.transform) {
				const isInteger =
					types.includes('integer') && Number.isInteger(parsedValue);
				args = isInteger
					? singleParam.transform.then
					: singleParam.transform.else;
				args[
					singleParam.transform.then.id || singleParam.transform.else.title
				] = parsedValue;
			} else {
				args = { [singleParam.name]: parsedValue };
			}
		} else {
			return {
				error: `Expected object or single value for ${commandName} with transform`,
				command: null,
			};
		}
	}

	// Normalize arguments
	args = ParserUtils.normalizeArgs(args);

	// Validate parameters against manifest
	const validatedArgs = {};

	// Check for unknown parameters
	for (const key of Object.keys(args)) {
		const param = parameters.find(
			(p) => p.name.toLowerCase() === key.toLowerCase(),
		);
		if (!param) {
			return {
				error: `Unknown parameter: ${key}`,
				command: null,
			};
		}
	}

	// Validate and process each parameter
	for (const param of parameters) {
		const key = param.name;
		
		// Get current value, applying fallback if needed
		let value = args[key];
		if (value === undefined && param.runtimeFallback && context && context.state && context.state.has(param.runtimeFallback)) {
			value = context.state.get(param.runtimeFallback);
			args[key] = value; // Update args with fallback value
		}

		// Check for missing required parameters
		if (value === undefined && param.required) {
			return {
				error: `Missing required parameter: ${key}`,
				command: null,
			};
		}

		// Apply default for optional parameters
		if (value === undefined && !param.required && param.default !== undefined) {
			validatedArgs[key] = param.default;
			continue;
		}

		if (value === undefined) continue;

		// Type validation
		const types = param.type.split('|').map((t) => t.trim());
		let parsedValue = value;

		if (types.includes('integer')) {
			parsedValue = parseInt(value, 10);
			if (isNaN(parsedValue)) {
				return { error: `Parameter ${key} must be an integer`, command: null };
			}
		} else if (types.includes('number')) {
			parsedValue = parseFloat(value);
			if (isNaN(parsedValue)) {
				return { error: `Parameter ${key} must be a number`, command: null };
			}
		} else if (types.includes('boolean')) {
			if (typeof value !== 'boolean') {
				const lowerValue = String(value).toLowerCase();
				if (lowerValue === 'true') parsedValue = true;
				else if (lowerValue === 'false') parsedValue = false;
				else
					return {
						error: `Parameter ${key} must be a boolean (true/false)`,
						command: null,
					};
			}
		} else if (types.includes('array')) {
			if (!Array.isArray(value)) {
				try {
					parsedValue = JSON.parse(value);
					if (!Array.isArray(parsedValue)) throw new Error();
				} catch {
					return { error: `Parameter ${key} must be an array`, command: null };
				}
			}
		} else if (types.includes('string')) {
			parsedValue = String(value);
		} else {
			return {
				error: `Unsupported type for ${key}: ${param.type}`,
				command: null,
			};
		}

		// Range validation for numbers
		if (types.includes('integer') || types.includes('number')) {
			if (param.min !== undefined && parsedValue < param.min) {
				return {
					error: `Parameter ${key} must be at least ${param.min}`,
					command: null,
				};
			}
			if (param.max !== undefined && parsedValue > param.max) {
				return {
					error: `Parameter ${key} must be at most ${param.max}`,
					command: null,
				};
			}
		}

		// Enum validation
		if (param.enum && !param.enum.includes(parsedValue)) {
			return {
				error: `Parameter ${key} must be one of: ${param.enum.join(', ')}`,
				command: null,
			};
		}

		validatedArgs[key] = parsedValue;
	}

	return {
		error: null,
		command: {
			name: command.name,
			args: validatedArgs,
		},
	};
}
