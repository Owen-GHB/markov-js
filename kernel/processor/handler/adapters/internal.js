/**
 * Handle a declarative internal command
 * @param {Object} command - The parsed command object
 * @param {Object} commandSpec - The command manifest specification
 * @returns {Object} - The result of the command
 */
export function handleInternalCommand(command, commandSpec) {
    const { args = {} } = command;

    // Validate required parameters only
    if (commandSpec.parameters) {
        for (const paramName in commandSpec.parameters) {
            const param = commandSpec.parameters[paramName];
            if (param.required && (args[paramName] === undefined || args[paramName] === null)) {
                throw new Error(`Parameter '${paramName}' is required for command '${commandSpec.name}'`);
            }
        }
    }

    // Just return success - template application happens in pipeline
    return {
        error: null,
        output: true, // Let pipeline apply template if successOutput exists
    };
}