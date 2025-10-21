export function parseObjectStyle([, name, argsString]) {
    let args;
    
    // Pure JSON parsing only
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

    if (typeof args !== 'object' || args === null) {
        throw new Error(`Expected object for ${name}`);
    }

    return {
        name: name,
        args: args, // Raw parsed values
    };
}