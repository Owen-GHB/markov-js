import { ParserUtils } from "./Utils.js";

/**
 * Parse a command in function style (e.g., "train(...)")
 * @param {string[]} - Destructured match from regex
 * @returns {{error: string|null, command: Object|null}}
 */
export function parseFunctionStyle([, name, argsString]) {
    let args = {};
    const argPairs = argsString.split(',').map(s => s.trim()).filter(Boolean);
    
    // Handle different command patterns
    const commandName = name.toLowerCase();
    
    if (commandName === 'train') {
        // Required params: file, modelType
        if (argPairs.length > 0 && !argPairs[0].includes('=')) {
            args.file = ParserUtils.normalizeValue(argPairs[0]);
        } else {
            return {
                error: 'First parameter (file) must be provided without key',
                command: null
            };
        }
        
        if (argPairs.length > 1 && !argPairs[1].includes('=')) {
            args.modelType = ParserUtils.normalizeValue(argPairs[1]);
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
            args[key] = ParserUtils.normalizeValue(value);
        }
    }
    else if (commandName === 'generate') {
        // Required param: model
        if (argPairs.length > 0 && !argPairs[0].includes('=')) {
            args.model = ParserUtils.normalizeValue(argPairs[0]);
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
            args[key] = ParserUtils.normalizeValue(value);
        }
    }
    else if (commandName === 'delete' || commandName === 'use') {
        // Only required param: modelName
        if (argPairs.length > 0 && !argPairs[0].includes('=')) {
            args.modelName = ParserUtils.normalizeValue(argPairs[0]);
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
    else if (commandName === 'pgb_search') {
        // Only key=value params allowed
        for (const pair of argPairs) {
            if (!pair.includes('=')) {
                return {
                    error: 'pgb_search requires key=value parameters (author, title, or subject)',
                    command: null
                };
            }
            const [key, value] = pair.split('=').map(s => s.trim());
            if (!['author', 'title', 'subject'].includes(key)) {
                return {
                    error: `Invalid search parameter: ${key}. Use author, title, or subject`,
                    command: null
                };
            }
            args[key] = ParserUtils.normalizeValue(value);
        }
    }
    else if (commandName === 'pgb_info') {
        if (argPairs.length !== 1) {
            return {
                error: 'pgb_info requires exactly one parameter (ID or title)',
                command: null
            };
        }
        
        const param = ParserUtils.normalizeValue(argPairs[0]);
        args = /^\d+$/.test(param) ? { id: param } : { title: param };
    }
    else if (commandName === 'pgb_download') {
        if (argPairs.length < 1) {
            return {
                error: 'pgb_download requires at least one parameter (ID or title)',
                command: null
            };
        }

        // First parameter can be ID or title
        const firstParam = ParserUtils.normalizeValue(argPairs[0]);
        args = /^\d+$/.test(firstParam) ? { id: firstParam } : { title: firstParam };

        // Handle optional filename parameter
        for (let i = 1; i < argPairs.length; i++) {
            if (!argPairs[i].includes('=')) {
                return {
                    error: 'Optional parameters must use key=value syntax (e.g., file="filename.txt")',
                    command: null
                };
            }
            const [key, value] = argPairs[i].split('=').map(s => s.trim());
            if (key === 'file') {
                args.file = ParserUtils.normalizeValue(value);
            }
        }
    }

    // Process any remaining named parameters (for other commands)
    for (const pair of argPairs) {
        if (pair.includes('=')) {
            const [key, value] = pair.split('=').map(s => s.trim());
            args[key] = ParserUtils.normalizeValue(value);
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