/**
 * Command parser for REPL-style interface
 * 
 * Supports object-style syntax:
 * - train({filename: "file.txt", order: 3})
 * - generate({length: 50, temperature: 0.8})
 */
export class CommandParser {
    constructor() {
        this.patterns = {
            // command_name({key: value}) - exact JS object syntax
            objectCall: /^(\w+)\s*\(\s*(\{.*\})\s*\)\s*$/,
            simpleCommand: /^(\w+)\s*$/
        };
    }

    parse(input) {
        if (!input || typeof input !== 'string') {
            throw new Error('Invalid input');
        }

        const trimmed = input.trim();
        
        const objectMatch = trimmed.match(this.patterns.objectCall);
        if (objectMatch) {
            const [, name, argsString] = objectMatch;
            try {
                // First try parsing as direct JSON (requires quoted property names)
                try {
                    const jsonArgs = JSON.parse(argsString);
                    return {
                        name: name.toLowerCase(),
                        args: this.normalizeArgs(jsonArgs)
                    };
                } catch (jsonError) {
                    // If JSON fails, parse as JS object literal with proper property wrapping
                    const wrappedArgsString = argsString.replace(/([{,]\s*)([a-zA-Z_$][\w$]*)(\s*:)/g, '$1"$2"$3');
                    const args = JSON.parse(wrappedArgsString);
                    return {
                        name: name.toLowerCase(),
                        args: this.normalizeArgs(args)
                    };
                }
            } catch (e) {
                throw new Error(`Invalid object syntax: ${argsString}`);
            }
        }

        const simpleMatch = trimmed.match(this.patterns.simpleCommand);
        if (simpleMatch) {
            return { name: simpleMatch[1].toLowerCase(), args: {} };
        }

        throw new Error(`Could not parse command: ${input}`);
    }

    normalizeArgs(args) {
        const result = {};
        for (const [key, value] of Object.entries(args)) {
            result[key] = this.normalizeValue(value);
        }
        return result;
    }

    normalizeValue(value) {
        if (typeof value === 'string') {
            const trimmed = value.trim();
            if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
                (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
                return trimmed.slice(1, -1);
            }
            return value;
        }
        return value;
    }

    getHelpText() {
        return `
Command Syntax:
  • Object style: command_name({key: value, key2: value2})
  • Simple style: command_name
  
Examples:
  • train({filename: "corpus.txt", order: 3})
  • generate({length: 100, temperature: 0.8})
  • save_model({filename: "my_model.json"})
  • stats()
  • help()
  
Argument Types:
  • Use JSON object syntax
  • Strings: "text" or 'text'
  • Numbers: 42, 3.14
  • Booleans: true, false
  • Null: null
        `.trim();
    }
}