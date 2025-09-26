import { parseObjectStyle } from './parsers/Objective.js';
import { parseFunctionStyle } from './parsers/Functional.js';
import manifest from '../manifest.json' with { type: 'json' };
/**
 * Command parser for REPL-style interface
 *
 * Supports both function-style and object-style syntax:
 * - train("corpus.txt", "markov", 2)
 * - train({file: "corpus.txt", modelType: "markov", order: 2})
 * - generate("model.json", 50)
 * - generate({model: "model.json", length: 50})
 */
export class CommandParser {
	constructor() {
		this.patterns = {
			objectCall: /^(\w+)\s*\(\s*(\{.*\})\s*\)\s*$/,
			funcCall: /^(\w+)\s*\(\s*([^)]*)\s*\)\s*$/,
			simpleCommand: /^(\w+)\s*$/,
			cliStyle: /^(\w+)\s+(.+)$/,
		};
	}

	/**
	 * Parse a command string into a command object
	 * @param {string} input - The command string to parse
	 * @returns {{error: string|null, command: Object|null}}
	 */
	parse(input) {
		if (!input || typeof input !== 'string') {
			return {
				error: 'Invalid input: must be a non-empty string',
				command: null,
			};
		}

		const trimmed = input.trim();

		// Try CLI-style parsing first
		const cliMatch = trimmed.match(this.patterns.cliStyle);
		if (cliMatch) {
			const spec = manifest.commands.find(
				(c) => c.name.toLowerCase() === cliMatch[1].toLowerCase(),
			);
			if (!(spec && spec.parameters.every((p) => !p.required))) {
				return this.parseCliStyle(cliMatch[1], cliMatch[2]);
			}
		}

		// Try object style first (backward compatible)
		const objectMatch = trimmed.match(this.patterns.objectCall);
		if (objectMatch) {
			return this.parseObjectStyle(objectMatch);
		}

		// Try function style
		const funcMatch = trimmed.match(this.patterns.funcCall);
		if (funcMatch) {
            console.log('Detected function style command');
			return this.parseFunctionStyle(funcMatch);
		}

		// Try simple command
		const simpleMatch = trimmed.match(this.patterns.simpleCommand);
		if (simpleMatch) {
            const funcCall = `${trimmed}()`;
            const match = funcCall.match(this.patterns.funcCall);
            if (match) return this.parseFunctionStyle(match);
		}

		return {
			error: `Could not parse command: ${input}`,
			command: null,
		};
	}

	parseCliStyle(command, argsString) {
		const spec = manifest.commands.find(
			(c) => c.name.toLowerCase() === command.toLowerCase(),
		);
		if (!spec) return { error: `Unknown command: ${command}`, command: null };

		const required = (spec.parameters || []).filter((p) => p.required);
		const parts = argsString.split(/\s+/).filter(Boolean);

		// Split into positional vs named pieces
		const positional = [];
		const named = [];

		for (const part of parts) {
			if (part.includes('=')) {
				named.push(part);
			} else {
				positional.push(part); // Remove JSON.stringify to avoid extra quotes
			}
		}

		// Map positional tokens to required parameters in order
		if (positional.length > required.length) {
			return {
				error: `Too many positional parameters for ${command}`,
				command: null,
			};
		}
		const positionalPairs = required
			.slice(0, positional.length)
			.map((p, i) => `${p.name}="${positional[i]}"`);

		// Build final function-style string
		const funcCall = `${command}(${[...positionalPairs, ...named].join(',')})`; // Remove space after comma
		const match = funcCall.match(this.patterns.funcCall);

		return parseFunctionStyle(match);
	}

	/**
	 * Parse a command in object style (e.g., "train({...})")
	 * @param {string[]} - Destructured match from regex
	 * @returns {{error: string|null, command: Object|null}}
	 */
	parseObjectStyle([, name, argsString]) {
		return parseObjectStyle([, name, argsString]);
	}

	/**
	 * Parse a command in function style (e.g., "train(...)")
	 * @param {string[]} - Destructured match from regex
	 * @returns {{error: string|null, command: Object|null}}
	 */
	parseFunctionStyle([, name, argsString]) {
		return parseFunctionStyle([, name, argsString]);
	}
}
