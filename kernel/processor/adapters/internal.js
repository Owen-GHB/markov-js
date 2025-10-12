/**
 * Simple template renderer that substitutes {{paramName}} with parameter values
 * @param {string} template - Template string with {{param}} placeholders
 * @param {Object} params - Parameter values to substitute
 * @returns {string} - Rendered template
 */
function renderTemplate(template, params) {
    if (!template || typeof template !== 'string') {
        return '';
    }

    return template.replace(/\{\{([^}]+)\}\}/g, (match, paramName) => {
        const trimmedParamName = paramName.trim();
        if (params && params.hasOwnProperty(trimmedParamName)) {
            return String(params[trimmedParamName]);
        }
        return match; // Keep original placeholder if param not found
    });
}

/**
 * Handle a declarative internal command
 * @param {Object} command - The parsed command object
 * @param {Object} commandSpec - The command manifest specification
 * @returns {Object} - The result of the command
 */
export function handleInternalCommand(command, commandSpec) {
    const { args = {} } = command;

    // Validate required parameters
    if (commandSpec.parameters) {
        for (const paramName in commandSpec.parameters) {
            const param = commandSpec.parameters[paramName];
            if (
                param.required &&
                (args[paramName] === undefined || args[paramName] === null)
            ) {
                return {
                    error: `Parameter '${paramName}' is required for command '${commandSpec.name}'`,
                    output: null,
                };
            }
        }
    }

    // Generate success output from template if provided
    let output = null;
    if (commandSpec.successOutput) {
        output = renderTemplate(commandSpec.successOutput, args);
    }

    return {
        error: null,
        output: output,
    };
}