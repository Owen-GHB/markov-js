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
        const commandName = name.toLowerCase();
        
        if (commandName === 'train') {
            // Required params: file, modelType
            if (argPairs.length > 0 && !argPairs[0].includes('=')) {
                args.file = this.normalizeValue(argPairs[0]);
            } else {
                return {
                    error: 'First parameter (file) must be provided without key',
                    command: null
                };
            }
            
            if (argPairs.length > 1 && !argPairs[1].includes('=')) {
                args.modelType = this.normalizeValue(argPairs[1]);
            } else if (argPairs.length > 1) {
                return {
                    error: 'Second parameter (modelType) must be provided without key',
                    command: null
                };
            }
            
            // Optional params must use key=value syntax
            for (let i = 2; i < argPairs.length; i++) {
                if (!argPairs[i].includes('=')) {
                    return {
                        error: `Optional parameters must use key=value syntax (got "${argPairs[i]}")`,
                        command: null
                    };
                }
                const [key, value] = argPairs[i].split('=').map(s => s.trim());
                args[key] = this.normalizeValue(value);
            }
        }
        else if (commandName === 'generate') {
            // Required param: model
            if (argPairs.length > 0 && !argPairs[0].includes('=')) {
                args.model = this.normalizeValue(argPairs[0]);
            } else {
                return {
                    error: 'First parameter (model) must be provided without key',
                    command: null
                };
            }
            
            // Optional params must use key=value syntax
            for (let i = 1; i < argPairs.length; i++) {
                if (!argPairs[i].includes('=')) {
                    return {
                        error: `Optional parameters must use key=value syntax (got "${argPairs[i]}")`,
                        command: null
                    };
                }
                const [key, value] = argPairs[i].split('=').map(s => s.trim());
                args[key] = this.normalizeValue(value);
            }
        }
        else if (commandName === 'delete' || commandName === 'use') {
            // Only required param: modelName
            if (argPairs.length > 0 && !argPairs[0].includes('=')) {
                args.modelName = this.normalizeValue(argPairs[0]);
            } else if (argPairs.length > 0) {
                return {
                    error: 'Parameter must be provided without key (e.g., delete("model.json"))',
                    command: null
                };
            }
            
            // No optional params for these commands
            if (argPairs.length > 1) {
                return {
                    error: `${commandName} command only accepts one parameter`,
                    command: null
                };
            }
        }
        else if (commandName === 'listmodels' || commandName === 'listcorpus') {
            // No parameters allowed
            if (argPairs.length > 0) {
                return {
                    error: `${commandName} command doesn't accept any parameters`,
                    command: null
                };
            }
        }

        // Process any remaining named parameters (for other commands)
        for (const pair of argPairs) {
            if (pair.includes('=')) {
                const [key, value] = pair.split('=').map(s => s.trim());
                args[key] = this.normalizeValue(value);
            }
        }

        return {
            error: null,
            command: {
                name: commandName,
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

}