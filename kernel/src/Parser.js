import { parseObjectStyle } from './parsers/Objective.js';
import { parseFunctionStyle } from './parsers/Functional.js';

// Constants - pure data, no state
const PATTERNS = {
	objectCall: /^(\w+)\s*\(\s*(\{.*\})\s*\)\s*$/,
	funcCall: /^(\w+)\s*\(\s*([^)]*)\s*\)\s*$/,
	simpleCommand: /^(\w+)\s*$/,
	cliStyle: /^(\w+)\s+(.+)$/,
};

/**
 * Static command parser for REPL-style interface
 *
 * Pure functional parsing - no state, no instances, no dependencies!
 *
 * Supports both function-style and object-style syntax:
 * - command("param1", "param2", key=value)
 * - command({param1: "value1", key: value2})
 * - command param1 param2 key=value
 */
export class Parser {
	// Expose patterns as static constants
	static patterns = PATTERNS;

	/**
	 * Parse a command string into a command object
	 * @param {string} input - The command string to parse
	 * @param {Object} commandSpec - The command specification
	 * @returns {Object} - Command object {name: string, args: Object}
	 */
	static parseCommand(input, commandSpec) {
		if (!input || typeof input !== 'string') {
			throw new Error('Invalid input: must be a non-empty string');
		}

		const trimmed = input.trim();

		// First, try to parse as JSON command object
		try {
			const commandObj = JSON.parse(trimmed);
			if (commandObj && typeof commandObj === 'object' && commandObj.name) {
				return commandObj;
			}
		} catch (jsonError) {
			// Not a JSON command object, continue with string parsing
		}

		// Try CLI-style parsing first
		const cliMatch = trimmed.match(PATTERNS.cliStyle);
		if (cliMatch) {
			if (
				!commandSpec.parameters ||
				Object.entries(commandSpec.parameters).every(([_, p]) => !p.required)
			) {
				return Parser.parseCliStyle(cliMatch[1], cliMatch[2], commandSpec);
			}
		}

		// Try object style first (backward compatible)
		const objectMatch = trimmed.match(PATTERNS.objectCall);
		if (objectMatch) {
			return parseObjectStyle(objectMatch, commandSpec);
		}

		// Try function style
		const funcMatch = trimmed.match(PATTERNS.funcCall);
		if (funcMatch) {
			return parseFunctionStyle(funcMatch, commandSpec);
		}

		// Try simple command
		const simpleMatch = trimmed.match(PATTERNS.simpleCommand);
		if (simpleMatch) {
			const funcCall = `${trimmed}()`;
			const match = funcCall.match(PATTERNS.funcCall);
			if (match) return parseFunctionStyle(match, commandSpec);
		}

		throw new Error(`Could not parse command: ${input}`);
	}

	/**
	 * Parse CLI-style arguments into command object
	 */
	static parseCliStyle(command, argsString, commandSpec) {
		if (!commandSpec) throw new Error(`Unknown command: ${command}`);

		const required = Object.entries(commandSpec.parameters || {})
			.filter(([_, p]) => p.required)
			.map(([name, param]) => ({ name, ...param }));
		const parts = argsString.split(/\s+/).filter(Boolean);

		// Split into positional vs named pieces
		const positional = [];
		const named = [];

		for (const part of parts) {
			if (part.includes('=')) {
				named.push(part);
			} else {
				positional.push(part);
			}
		}

		// Map positional tokens to required parameters in order
		if (positional.length > required.length) {
			throw new Error(`Too many positional parameters for ${command}`);
		}

		const positionalPairs = required
			.slice(0, positional.length)
			.map((p, i) => `${p.name}="${positional[i]}"`);

		// Build final function-style string
		const funcCall = `${command}(${[...positionalPairs, ...named].join(',')})`;
		const match = funcCall.match(PATTERNS.funcCall);

		return parseFunctionStyle(match, commandSpec);
	}

	/**
	 * Extract command name from input string (without full parsing)
	 */
	static extractCommandName(input) {
		if (!input || typeof input !== 'string') {
			throw new Error('Invalid input: must be a non-empty string');
		}

		const trimmed = input.trim();

		// Try simple command first
		const simpleMatch = trimmed.match(PATTERNS.simpleCommand);
		if (simpleMatch) return simpleMatch[1];

		// Try function style
		const funcMatch = trimmed.match(PATTERNS.funcCall);
		if (funcMatch) return funcMatch[1];

		// Try object style
		const objectMatch = trimmed.match(PATTERNS.objectCall);
		if (objectMatch) return objectMatch[1];

		// Try CLI style
		const cliMatch = trimmed.match(PATTERNS.cliStyle);
		if (cliMatch) return cliMatch[1];

		throw new Error(`Could not extract command name from: ${input}`);
	}
}
