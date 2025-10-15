// File: processor/parsers/Objective.js
import { ParserUtils } from './Utils.js';

/**
 * Parse a command in object style
 * @param {string[]} match - Destructured match from regex
 * @param {Object} context - Optional context with runtime state
 * @param {Object} manifest - The application manifest
 * @returns {{error: string|null, command: Object|null}}
 */
export function parseObjectStyle([, name, argsString], context = {}, manifest) {
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

    let args;
    // PRESERVE ORIGINAL OBJECT PARSING LOGIC WITH FALLBACKS
    try {
        // Try parsing as JSON
        args = JSON.parse(argsString);
    } catch (e) {
        try {
            // Fallback: Convert JS object literal to JSON (add quotes around keys)
            const wrappedArgsString = argsString.replace(
                /([{,]\s*)([a-zA-Z_$][\w$]*)(\s*:)/g,
                '$1"$2"$3',
            );
            args = JSON.parse(wrappedArgsString);
        } catch (fallbackError) {
            return {
                error: `Invalid object syntax: ${argsString}`,
                command: null,
            };
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

            // Validate and parse type
            if (types.includes('integer') && !isNaN(parseInt(args, 10))) {
                parsedValue = parseInt(args, 10);
            } else if (types.includes('string')) {
                parsedValue = String(args);
            } else {
                return {
                    error: `Parameter ${paramName} must be ${singleParam.type}`,
                    command: null,
                };
            }

            // Apply transform rule from manifest
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
            return {
                error: `Expected object or single value for ${commandName} with transform`,
                command: null,
            };
        }
    }

    // Normalize arguments using shared utility
    args = ParserUtils.normalizeArgs(args);

    // USE SHARED VALIDATION INSTEAD OF DUPLICATE CODE
    const validationResult = ParserUtils.processParameters(commandName, args, parameters, context);
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