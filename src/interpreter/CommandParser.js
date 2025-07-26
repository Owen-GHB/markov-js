import { parseObjectStyle } from "./parsers/Objective.js";
import { parseFunctionStyle } from "./parsers/Functional.js";
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
            cliStyle: /^(\w+)\s+(.+)$/
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
                command: null
            };
        }

        const trimmed = input.trim();

        // Try CLI-style parsing first
        const cliMatch = trimmed.match(this.patterns.cliStyle);
        if (cliMatch) {
            return this.parseCliStyle(cliMatch[1], cliMatch[2]);
        }
        
        // Try object style first (backward compatible)
        const objectMatch = trimmed.match(this.patterns.objectCall);
        if (objectMatch) {
            return this.parseObjectStyle(objectMatch);
        }

        // Try function style
        const funcMatch = trimmed.match(this.patterns.funcCall);
        if (funcMatch) {
            return this.parseFunctionStyle(funcMatch);
        }

        // Try simple command
        const simpleMatch = trimmed.match(this.patterns.simpleCommand);
        if (simpleMatch) {
            return { 
                error: null,
                command: { 
                    name: simpleMatch[1].toLowerCase(), 
                    args: {} 
                }
            };
        }

        return {
            error: `Could not parse command: ${input}`,
            command: null
        };
    }

    parseCliStyle(command, argsString) {
            const args = argsString
                .split(/\s+/)
                .filter(Boolean)
                .map(arg => {
                    return arg.includes('=') ? arg : JSON.stringify(arg);
                });

            const funcCall = `${command}(${args.join(', ')})`;
            const match = funcCall.match(/^(\w+)\((.*)\)$/);
            if (!match) {
                return { error: 'Invalid command format', command: null };
            }

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