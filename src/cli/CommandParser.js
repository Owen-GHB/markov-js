// src/cli/CommandParser.js

/**
 * Simple command parser for REPL-style interface
 * 
 * Supports function-like syntax:
 * - build_dict("file.txt", order=3)
 * - generate(length=50, temperature=0.8)
 * - save_model("my_model.json")
 */
export class CommandParser {
    constructor() {
        // Regex patterns for different command formats
        this.patterns = {
            // function_name(arg1, arg2, key=value)
            functionCall: /^(\w+)\s*\((.*)\)\s*$/,
            // Simple commands without parentheses
            simpleCommand: /^(\w+)\s*$/
        };
    }

    /**
     * Parse user input into command structure.
     * @param {string} input - Raw user input.
     * @returns {Object} - Parsed command with name and args.
     */
    parse(input) {
        if (!input || typeof input !== 'string') {
            throw new Error('Invalid input');
        }

        const trimmed = input.trim();
        
        // Try function call pattern first
        const functionMatch = trimmed.match(this.patterns.functionCall);
        if (functionMatch) {
            const [, name, argsString] = functionMatch;
            const args = this.parseArguments(argsString);
            return { name: name.toLowerCase(), args };
        }

        // Try simple command pattern
        const simpleMatch = trimmed.match(this.patterns.simpleCommand);
        if (simpleMatch) {
            return { name: simpleMatch[1].toLowerCase(), args: {} };
        }

        throw new Error(`Could not parse command: ${input}`);
    }

    /**
     * Parse function arguments string.
     * @param {string} argsString - Arguments string from inside parentheses.
     * @returns {Object} - Parsed arguments object.
     */
    parseArguments(argsString) {
        if (!argsString.trim()) {
            return {};
        }

        const args = {};
        let positionalIndex = 0;
        
        // Split arguments, respecting quotes
        const argTokens = this.splitArguments(argsString);
        
        for (const token of argTokens) {
            const keyValueMatch = token.match(/^(\w+)\s*=\s*(.+)$/);
            
            if (keyValueMatch) {
                // Named argument: key=value
                const [, key, value] = keyValueMatch;
                args[key] = this.parseValue(value);
            } else {
                // Positional argument
                const positionalKey = this.getPositionalKey(positionalIndex);
                args[positionalKey] = this.parseValue(token);
                positionalIndex++;
            }
        }

        return args;
    }

    /**
     * Split arguments string, respecting quoted strings.
     * @param {string} argsString - Arguments to split.
     * @returns {string[]} - Array of argument tokens.
     */
    splitArguments(argsString) {
        const tokens = [];
        let current = '';
        let inQuotes = false;
        let quoteChar = '';
        
        for (let i = 0; i < argsString.length; i++) {
            const char = argsString[i];
            
            if (!inQuotes && (char === '"' || char === "'")) {
                inQuotes = true;
                quoteChar = char;
                current += char;
            } else if (inQuotes && char === quoteChar) {
                inQuotes = false;
                current += char;
            } else if (!inQuotes && char === ',') {
                if (current.trim()) {
                    tokens.push(current.trim());
                }
                current = '';
            } else {
                current += char;
            }
        }
        
        if (current.trim()) {
            tokens.push(current.trim());
        }
        
        return tokens;
    }

    /**
     * Parse a single value, handling different types.
     * @param {string} value - String value to parse.
     * @returns {*} - Parsed value (string, number, boolean, etc.).
     */
    parseValue(value) {
        const trimmed = value.trim();
        
        // Handle quoted strings
        if ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
            (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
            return trimmed.slice(1, -1);
        }
        
        // Handle numbers
        if (/^-?\d+$/.test(trimmed)) {
            return parseInt(trimmed, 10);
        }
        
        if (/^-?\d*\.\d+$/.test(trimmed)) {
            return parseFloat(trimmed);
        }
        
        // Handle booleans
        if (trimmed.toLowerCase() === 'true') {
            return true;
        }
        
        if (trimmed.toLowerCase() === 'false') {
            return false;
        }
        
        // Handle null/undefined
        if (trimmed.toLowerCase() === 'null') {
            return null;
        }
        
        if (trimmed.toLowerCase() === 'undefined') {
            return undefined;
        }
        
        // Default to string (unquoted)
        return trimmed;
    }

    /**
     * Get positional argument key based on command and index.
     * @param {number} index - Positional index.
     * @returns {string} - Argument key name.
     */
    getPositionalKey(index) {
        // Map positional arguments to meaningful names
        const positionalMappings = {
            0: 'filename',  // First arg usually a filename
            1: 'order',     // Second arg often order or length
            2: 'length',    // Third arg might be length
            3: 'temperature' // Fourth arg might be temperature
        };
        
        return positionalMappings[index] || `arg${index}`;
    }

    /**
     * Validate parsed command against expected signatures.
     * @param {Object} command - Parsed command.
     * @param {Object} expectedSignatures - Expected command signatures.
     * @returns {boolean} - True if valid.
     */
    validate(command, expectedSignatures = {}) {
        const signature = expectedSignatures[command.name];
        
        if (!signature) {
            // Unknown command, let the handler deal with it
            return true;
        }
        
        // Check required arguments
        for (const requiredArg of signature.required || []) {
            if (!(requiredArg in command.args)) {
                throw new Error(`Missing required argument: ${requiredArg}`);
            }
        }
        
        // Check argument types
        for (const [argName, argValue] of Object.entries(command.args)) {
            const expectedType = signature.types?.[argName];
            if (expectedType && !this.checkType(argValue, expectedType)) {
                throw new Error(`Argument ${argName} should be of type ${expectedType}, got ${typeof argValue}`);
            }
        }
        
        return true;
    }

    /**
     * Check if value matches expected type.
     * @param {*} value - Value to check.
     * @param {string} expectedType - Expected type name.
     * @returns {boolean} - True if type matches.
     */
    checkType(value, expectedType) {
        switch (expectedType.toLowerCase()) {
            case 'string':
                return typeof value === 'string';
            case 'number':
                return typeof value === 'number' && !isNaN(value);
            case 'integer':
                return typeof value === 'number' && Number.isInteger(value);
            case 'boolean':
                return typeof value === 'boolean';
            case 'array':
                return Array.isArray(value);
            case 'object':
                return typeof value === 'object' && value !== null && !Array.isArray(value);
            default:
                return true; // Unknown type, assume valid
        }
    }

    /**
     * Get help text for command syntax.
     * @returns {string} - Help text.
     */
    getHelpText() {
        return `
Command Syntax:
  • Function style: command_name(arg1, arg2, key=value)
  • Simple style: command_name
  
Examples:
  • build_dict("corpus.txt", order=3)
  • generate(length=100, temperature=0.8)
  • save_model("my_model.json")
  • stats
  • help
  
Argument Types:
  • Strings: "quoted text" or 'quoted text'
  • Numbers: 42, 3.14, -10
  • Booleans: true, false
  • Null: null
        `.trim();
    }
}