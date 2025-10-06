import { ParserUtils } from './Utils.js';

/**
 * Parse a command in object style
 * @param {string[]} match - Destructured match from regex
 * @param {Object} context - Optional context with runtime state
 * @param {Object} manifest - The application manifest
 * @returns {{error: string|null, command: Object|null}}
 */
export function parseObjectStyle([, name, argsString], context = {}, manifest) {
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

	const parameters = command.parameters || {};
	const requiredParams = Object.entries(parameters).filter(([_, p]) => p.required).map(([name, param]) => ({name, ...param}));
	const optionalParams = Object.entries(parameters).filter(([_, p]) => !p.required).map(([name, param]) => ({name, ...param}));

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
		const paramEntries = Object.entries(parameters);
		const singleParamEntry = paramEntries.find(([_, p]) => p.required && p.transform);
		if (singleParamEntry) {
			const [paramName, singleParam] = singleParamEntry;
			const types = singleParam.type.split('|').map((t) => t.trim());
			let parsedValue = args;

			// Validate and parse type
			if (types.includes('integer') && !isNaN(parseInt(args, 10))) {
				parsedValue = parseInt(args, 10);
			} else if (types.includes('string')) {
				parsedValue = String(args);
			} else {
				return {
					error: `Parameter ${paramName} must be ${singleParam.type}`,
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
				args = { [paramName]: parsedValue };
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
		const paramName = Object.keys(parameters).find(p => p.toLowerCase() === key.toLowerCase());
		if (!paramName) {
			return {
				error: `Unknown parameter: ${key}`,
				command: null,
			};
		}
	}

	// Validate and process each parameter
	for (const paramName in parameters) {
		const param = parameters[paramName];
		
		// Get current value, applying fallback if needed
		let value = args[paramName];
		if (value === undefined && param.runtimeFallback && context && context.state && context.state.has(param.runtimeFallback)) {
			value = context.state.get(param.runtimeFallback);
			args[paramName] = value; // Update args with fallback value
		}

		// Check for missing required parameters
		if (value === undefined && param.required) {
			return {
				error: `Missing required parameter: ${paramName}`,
				command: null,
			};
		}

		// Apply default for optional parameters
		if (value === undefined && !param.required && param.default !== undefined) {
			validatedArgs[paramName] = param.default;
			continue;
		}

		if (value === undefined) continue;

		// Type validation
		const types = param.type.split('|').map((t) => t.trim());
		let parsedValue = value;

		if (types.includes('integer')) {
			parsedValue = parseInt(value, 10);
			if (isNaN(parsedValue)) {
				return { error: `Parameter ${paramName} must be an integer`, command: null };
			}
		} else if (types.includes('number')) {
			parsedValue = parseFloat(value);
			if (isNaN(parsedValue)) {
				return { error: `Parameter ${paramName} must be a number`, command: null };
			}
		} else if (types.includes('boolean')) {
			if (typeof value !== 'boolean') {
				const lowerValue = String(value).toLowerCase();
				if (lowerValue === 'true') parsedValue = true;
				else if (lowerValue === 'false') parsedValue = false;
				else
					return {
						error: `Parameter ${paramName} must be a boolean (true/false)`,
						command: null,
					};
			}
		} else if (types.includes('array')) {
			if (!Array.isArray(value)) {
				try {
					parsedValue = JSON.parse(value);
					if (!Array.isArray(parsedValue)) throw new Error();
				} catch {
					return { error: `Parameter ${paramName} must be an array`, command: null };
				}
			}
		} else if (types.includes('string')) {
			parsedValue = String(value);
		} else {
			return {
				error: `Unsupported type for ${paramName}: ${param.type}`,
				command: null,
			};
		}

		// Range validation for numbers
		if (types.includes('integer') || types.includes('number')) {
			if (param.min !== undefined && parsedValue < param.min) {
				return {
					error: `Parameter ${paramName} must be at least ${param.min}`,
					command: null,
				};
			}
			if (param.max !== undefined && parsedValue > param.max) {
				return {
					error: `Parameter ${paramName} must be at most ${param.max}`,
					command: null,
				};
			}
		}

		// Enum validation
		if (param.enum && !param.enum.includes(parsedValue)) {
			return {
				error: `Parameter ${paramName} must be one of: ${param.enum.join(', ')}`,
				command: null,
			};
		}

		validatedArgs[paramName] = parsedValue;
	}

	return {
		error: null,
		command: {
			name: command.name,
			args: validatedArgs,
		},
	};
}
