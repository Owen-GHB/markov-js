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
            objectCall: /^(\w+)\s*\(\s*(\{.*\})\s*\)\s*$/,  // obj style
            funcCall: /^(\w+)\s*\(\s*([^)]*)\s*\)\s*$/,     // func style
            simpleCommand: /^(\w+)\s*$/                      // no args
        };
    }

    parse(input) {
        if (!input || typeof input !== 'string') {
            return { 
                error: 'Invalid input: must be a non-empty string',
                command: null
            };
        }

        const trimmed = input.trim();
        
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

    parseObjectStyle([, name, argsString]) {
        try {
            const jsonArgs = JSON.parse(argsString);
            return {
                error: null,
                command: {
                    name: name.toLowerCase(),
                    args: this.normalizeArgs(jsonArgs)
                }
            };
        } catch (e) {
            try {
                // Fallback to JS object literal parsing
                const wrappedArgsString = argsString.replace(/([{,]\s*)([a-zA-Z_$][\w$]*)(\s*:)/g, '$1"$2"$3');
                const args = JSON.parse(wrappedArgsString);
                return {
                    error: null,
                    command: {
                        name: name.toLowerCase(),
                        args: this.normalizeArgs(args)
                    }
                };
            } catch (fallbackError) {
                return {
                    error: `Invalid object syntax: ${argsString}`,
                    command: null
                };
            }
        }
    }

    parseFunctionStyle([, name, argsString]) {
        const args = {};
        const argPairs = argsString.split(',').map(s => s.trim()).filter(Boolean);
        
        // Handle different command patterns
        if (name.toLowerCase() === 'train') {
            // Existing train command handling
            if (argPairs.length > 0 && !argPairs[0].includes('=')) {
                args.file = this.normalizeValue(argPairs[0]);
                if (argPairs.length > 1 && !argPairs[1].includes('=')) {
                    args.modelType = this.normalizeValue(argPairs[1]);
                    if (argPairs.length > 2 && !argPairs[2].includes('=')) {
                        args.order = Number(argPairs[2]);
                    }
                }
            }
        } 
        else if (name.toLowerCase() === 'generate') {
            // Existing generate command handling
            if (argPairs.length > 0 && !argPairs[0].includes('=')) {
                args.model = this.normalizeValue(argPairs[0]);
                if (argPairs.length > 1 && !argPairs[1].includes('=')) {
                    args.length = Number(argPairs[1]);
                }
            }
        }
        else if (name.toLowerCase() === 'delete' || name.toLowerCase() === 'use') {
            // Handle delete and use commands which take a single filename
            if (argPairs.length > 0 && !argPairs[0].includes('=')) {
                args.modelName = this.normalizeValue(argPairs[0]);
            }
        }

        // Process any named parameters
        for (const pair of argPairs) {
            if (pair.includes('=')) {
                const [key, value] = pair.split('=').map(s => s.trim());
                args[key] = this.normalizeValue(value);
            }
        }

        return {
            error: null,
            command: {
                name: name.toLowerCase(),
                args
            }
        };
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
🔗 Markov Chain Text Generator
=============================

Available commands:
train(file, modelType, [order]) - Train model from text file
    modelTypes: "markov", "vlmm", "hmm"
    order: Markov order (default: 2)
generate(model, [length])      - Generate text from model
listModels()                   - List available saved models
listCorpus()                   - List available corpus files
delete("modelName.json")       - Delete a saved model
use("modelName.json")          - Set current model to use
stats()                        - Show model statistics
help()                         - Show this help message
exit                           - Exit the program

Command Syntax:
• Function style: command(param1, param2, name=value)
• Object style: command({name: value, name2: value2})
• Simple style: command
`;
    }

}