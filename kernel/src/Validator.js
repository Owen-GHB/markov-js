// Static imports - no async initialization needed
import blobType from './types/blob.js';
import bufferType from './types/buffer.js';
import integerType from './types/integer.js';
import numberType from './types/number.js';
import booleanType from './types/boolean.js';
import arrayType from './types/array.js';
import objectType from './types/object.js';
import stringType from './types/string.js';

// Define types object with explicit order
const types = {
	blob: blobType,
	buffer: bufferType,
	integer: integerType,
	number: numberType,
	boolean: booleanType,
	array: arrayType,
	object: objectType,
	string: stringType,
};

// Maintain order for type union resolution
const typeOrder = Object.keys(types);

export class Validator {
	// Make types and typeOrder static properties
	static types = types;
	static typeOrder = typeOrder;

	/**
	 * Find the appropriate type handler for a value and spec
	 */
	static findTypeHandler(value, spec) {
		for (const typeName of Validator.typeOrder) {
			const handler = Validator.types[typeName];
			if (handler && handler.accepts(value, spec)) {
				return handler;
			}
		}
		throw new Error(`No type handler found for type: ${spec.type}`);
	}

	/**
	 * Validate and normalize a single parameter
	 */
	static validateParameter(paramName, value, paramSpec) {
		if (value === undefined && !paramSpec.required) {
			return undefined; // Skip optional missing parameters
		}

		if (value === undefined && paramSpec.required) {
			throw new Error(`Missing required parameter: ${paramName}`);
		}

		const handler = Validator.findTypeHandler(value, paramSpec);

		// Validate and normalize using the type handler
		const normalizedValue = handler.validate(value, paramSpec);

		// Enum validation (applies to all types)
		if (paramSpec.enum && !paramSpec.enum.includes(normalizedValue)) {
			throw new Error(
				`Parameter ${paramName} must be one of: ${paramSpec.enum.join(', ')}`,
			);
		}

		return normalizedValue;
	}

	/**
	 * Main validation entry point - throws on error, returns validated args on success
	 */
	static validateAll(commandName, args, parameters) {
		// Check for unknown parameters
		Validator.validateUnknownParameters(args, parameters);

		const validatedArgs = {};

		// Process each parameter
		for (const [paramName, paramSpec] of Object.entries(parameters)) {
			const value = Validator.validateParameter(
				paramName,
				args[paramName],
				paramSpec,
			);
			if (value !== undefined) {
				validatedArgs[paramName] = value;
			}
		}

		return validatedArgs;
	}

	/**
	 * Validate unknown parameters (security check)
	 */
	static validateUnknownParameters(args, parameters) {
		for (const key of Object.keys(args)) {
			const paramName = Object.keys(parameters).find(
				(p) => p.toLowerCase() === key.toLowerCase(),
			);
			if (!paramName) {
				throw new Error(`Unknown parameter: ${key}`);
			}
		}
	}
}
