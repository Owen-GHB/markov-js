import { ParserUtils } from './Utils.js';
import { ParameterValidator } from './ParameterValidator.js';
import { ParameterNormalizer } from './ParameterNormalizer.js';

/**
 * Parse a command in function style
 * @param {string[]} match - Destructured match from regex
 * @param {Object} context - Optional context with runtime state
 * @param {Object} manifest - The application manifest
 * @returns {{error: string|null, command: Object|null}}
 */
export function parseFunctionStyle([, name, argsString], context = {}, manifest) {
    const commandName = name.toLowerCase();

    // Find the command in manifest
    const command = ParserUtils.findCommand(commandName, manifest);
    if (!command) {
        return {
            error: `Unknown command: ${name}`,
            command: null,
        };
    }

    const parameters = command.parameters || {};
    const requiredParams = Object.entries(parameters)
        .filter(([_, p]) => p.required)
        .map(([name, param]) => ({ name, ...param }));
    const optionalParams = Object.entries(parameters)
        .filter(([_, p]) => !p.required)
        .map(([name, param]) => ({ name, ...param }));

    let args = {};
    const argPairs = argsString
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

    let positionalIndex = 0;

    // Process arguments - preserving original parsing logic
    for (const argPair of argPairs) {
        if (argPair.includes('=')) {
            // Named parameter: key=value
            const [key, valueStr] = argPair.split('=', 2).map((s) => s.trim());
            if (!key || !valueStr) {
                return {
                    error: `Invalid named parameter: ${argPair}`,
                    command: null,
                };
            }

            // Validate parameter exists
            const paramName = Object.keys(parameters).find(
                (p) => p.toLowerCase() === key.toLowerCase(),
            );
            if (!paramName) {
                return {
                    error: `Unknown parameter: ${key}`,
                    command: null,
                };
            }

            args[paramName] = ParserUtils.normalizeValue(valueStr);
        } else {
            // Positional parameter
            if (positionalIndex >= requiredParams.length) {
                return {
                    error: `Unexpected positional parameter: ${argPair}. All required parameters already provided.`,
                    command: null,
                };
            }

            const param = requiredParams[positionalIndex];
            args[param.name] = ParserUtils.normalizeValue(argPair);
            positionalIndex++;
        }
    }

    // Use the new ParameterNormalizer for validation and normalization
    const validationResult = ParameterNormalizer.processParameters(commandName, args, parameters, context);
    if (validationResult.error) {
        return { error: validationResult.error, command: null };
    }

    return {
        error: null,
        command: {
            name: command.name,
            args: validationResult.args,
        },
    };
}