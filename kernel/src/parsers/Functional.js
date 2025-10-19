import { ParserUtils } from './Utils.js';

export function parseFunctionStyle([, name, argsString], commandSpec) {
    const parameters = commandSpec.parameters || {};
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

    // Process arguments - raw parsing only
    for (const argPair of argPairs) {
        if (argPair.includes('=')) {
            // Named parameter: key=value
            const [key, valueStr] = argPair.split('=', 2).map((s) => s.trim());
            if (!key || !valueStr) {
                throw new Error(`Invalid named parameter: ${argPair}`);
            }

            // Validate parameter exists
            const paramName = Object.keys(parameters).find(
                (p) => p.toLowerCase() === key.toLowerCase(),
            );
            if (!paramName) {
                throw new Error(`Unknown parameter: ${key}`);
            }

            args[paramName] = ParserUtils.normalizeValue(valueStr);
        } else {
            // Positional parameter
            if (positionalIndex >= requiredParams.length) {
                throw new Error(`Unexpected positional parameter: ${argPair}. All required parameters already provided.`); // THROW!
            }

            const param = requiredParams[positionalIndex];
            args[param.name] = ParserUtils.normalizeValue(argPair);
            positionalIndex++;
        }
    }

    return {
        name: commandSpec.name,
        args: args,
    };
}