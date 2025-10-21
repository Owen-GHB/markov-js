export function parseFunctionStyle([, name, argsString], commandSpec) {
    const parameters = commandSpec?.parameters || {};
    const paramNames = Object.keys(parameters);
    
    let args = {};
    const argPairs = argsString
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

    let positionalIndex = 0;

    for (const argPair of argPairs) {
        if (argPair.includes('=')) {
            // Named parameter: key=value
            const [key, valueStr] = argPair.split('=', 2).map((s) => s.trim());
            args[key] = valueStr; // Raw string value
        } else {
            // Positional parameter - use parameter order from commandSpec
            if (positionalIndex < paramNames.length) {
                const paramName = paramNames[positionalIndex];
                args[paramName] = argPair; // Raw string value
                positionalIndex++;
            } else {
                throw new Error(`Too many positional arguments`);
            }
        }
    }
    return {
        name: name,
        args: args, // Clean structure: {param1: "value1", param2: "value2"}
    };
}