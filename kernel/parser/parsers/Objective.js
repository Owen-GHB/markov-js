import { ParserUtils } from './Utils.js';

export function parseObjectStyle([, name, argsString], manifest) {
    // Find the command in manifest
    const command = manifest.commands[name];
    if (!command) {
        throw new Error(`Unknown command: ${name}`);
    }

    const parameters = command.parameters || {};

    let args;
    // Raw object parsing only
    try {
        // Try parsing as JSON
        args = JSON.parse(argsString);
    } catch (e) {
        try {
            // Fallback: Convert JS object literal to JSON
            const wrappedArgsString = argsString.replace(
                /([{,]\s*)([a-zA-Z_$][\w$]*)(\s*:)/g,
                '$1"$2"$3',
            );
            args = JSON.parse(wrappedArgsString);
        } catch (fallbackError) {
            throw new Error(`Invalid object syntax: ${argsString}`);
        }
    }

    // Handle non-object inputs for parameters with transform rules
    if (typeof args !== 'object' || args === null) {
        const paramEntries = Object.entries(parameters);
        const singleParamEntry = paramEntries.find(
            ([_, p]) => p.required && p.transform,
        );
        if (singleParamEntry) {
            const [paramName, singleParam] = singleParamEntry;
            const types = singleParam.type.split('|').map((t) => t.trim());
            let parsedValue = args;

            // Basic type parsing
            if (types.includes('integer') && !isNaN(parseInt(args, 10))) {
                parsedValue = parseInt(args, 10);
            } else if (types.includes('string')) {
                parsedValue = String(args);
            } else {
                throw new Error(`Parameter ${paramName} must be ${singleParam.type}`);
            }

            // Apply transform rule
            if (singleParam.transform) {
                const isInteger =
                    types.includes('integer') && Number.isInteger(parsedValue);
                args = isInteger
                    ? singleParam.transform.then
                    : singleParam.transform.else;
                args[
                    singleParam.transform.then.id || singleParam.transform.else.title
                ] = parsedValue;
            } else {
                args = { [paramName]: parsedValue };
            }
        } else {
            throw new Error(`Expected object or single value for ${command.name} with transform`); 
        }
    }

    // Basic normalization only
    args = ParserUtils.normalizeArgs(args);

    return {
        name: command.name,
        args: args,
    };
}