import { parseObjectStyle } from './parsers/Objective.js';
import { parseFunctionStyle } from './parsers/Functional.js';

/**
 * Command parser for REPL-style interface
 *
 * Supports both function-style and object-style syntax:
 * - command("param1", "param2", key=value)
 * - command({param1: "value1", key: value2})
 * - command param1 param2 key=value
 */
export class Parser {
    constructor(manifest) {
        // Validate manifest parameter
        if (!manifest || typeof manifest !== 'object') {
            throw new Error('CommandParser requires a manifest object');
        }

        this.manifest = manifest;
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
     * @param {Object} context - Optional context with runtime state
     * @returns {Object} - Command object {name: string, args: Object}
     */
    parseCommand(input) {
        if (!input || typeof input !== 'string') {
            throw new Error('Invalid input: must be a non-empty string');
        }

        const trimmed = input.trim();

        // First, try to parse as JSON command object
        try {
            const commandObj = JSON.parse(trimmed);
            if (commandObj && typeof commandObj === 'object' && commandObj.name) {
                // This is a valid JSON command object
                return commandObj; // Return raw command object!
            }
        } catch (jsonError) {
            // Not a JSON command object, continue with string parsing
        }

        // Try CLI-style parsing first
        const cliMatch = trimmed.match(this.patterns.cliStyle);
        if (cliMatch) {
            const spec = this.manifest.commands[cliMatch[1]];
            if (
                !(
                    spec &&
                    Object.entries(spec.parameters || {}).every(([_, p]) => !p.required)
                )
            ) {
                return this.parseCliStyle(cliMatch[1], cliMatch[2]);
            }
        }

        // Try object style first (backward compatible)
        const objectMatch = trimmed.match(this.patterns.objectCall);
        if (objectMatch) {
            return parseObjectStyle(objectMatch, this.manifest);
        }

        // Try function style
        const funcMatch = trimmed.match(this.patterns.funcCall);
        if (funcMatch) {
            return parseFunctionStyle(funcMatch, this.manifest);
        }

        // Try simple command
        const simpleMatch = trimmed.match(this.patterns.simpleCommand);
        if (simpleMatch) {
            const funcCall = `${trimmed}()`;
            const match = funcCall.match(this.patterns.funcCall);
            if (match) return parseFunctionStyle(match, this.manifest);
        }

        throw new Error(`Could not parse command: ${input}`);
    }

    parseCliStyle(command, argsString) {
        const spec = this.manifest.commands[command];
        if (!spec) throw new Error(`Unknown command: ${command}`);

        const required = Object.entries(spec.parameters || {})
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
        const match = funcCall.match(this.patterns.funcCall);

        return parseFunctionStyle(match, this.manifest);
    }
}