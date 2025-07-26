import { ParserUtils } from "./Utils.js";

/**
 * Parse a command in object style (e.g., "train({...})")
 * @param {string[]} - Destructured match from regex
 * @returns {{error: string|null, command: Object|null}}
 */
export function parseObjectStyle([, name, argsString]) {
    try {
        const jsonArgs = JSON.parse(argsString);
        return {
            error: null,
            command: {
                name: name.toLowerCase(),
                args: ParserUtils.normalizeArgs(jsonArgs)
            }
        };
    } catch (e) {
        try {
            // Fallback to JS object literal parsing
            const wrappedArgsString = argsString.replace(/([{,]\s*)([a-zA-Z_$][\w$]*)(\s*:)/g, '$1"$2"$3');
            const args = JSON.parse(wrappedArgsString);
            if (name === 'pgb_info') {
                // Support both object style and direct value
                if (typeof jsonArgs === 'string' || typeof jsonArgs === 'number') {
                    const param = String(jsonArgs);
                    args = /^\d+$/.test(param) ? { id: param } : { title: param };
                } else {
                    args = ParserUtils.normalizeArgs(jsonArgs);
                }
            }
            return {
                error: null,
                command: {
                    name: name.toLowerCase(),
                    args: ParserUtils.normalizeArgs(args)
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