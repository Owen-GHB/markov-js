export class NativeAdapter {
    /**
     * Handle native method commands - pure execution logic
     */
    async handle(resourceMethod, command, commandSpec) {
        const { args = {} } = command;
        const combineArguments = commandSpec.combineArguments === true;
        const syncMethod = commandSpec.syncMethod === true;

        // Handle missing methodName - treat as internal command
        if (!commandSpec.methodName) return true;

        let result;
        
        if (syncMethod) {
            if (resourceMethod.constructor.name === 'AsyncFunction') {
                console.warn(`⚠️ Method '${commandSpec.methodName}' is declared as sync but is an async function. Falling back to async execution.`);
            } else {
                // Sync execution
                if (combineArguments) {
                    result = resourceMethod(args);
                } else {
                    const methodArgs = this.buildMethodArguments(args, commandSpec);
                    result = resourceMethod(...methodArgs);
                }
                return result;
            }
        }
        
        // Default async execution (or fallback from above)
        if (combineArguments) {
            result = await resourceMethod(args);
        } else {
            const methodArgs = this.buildMethodArguments(args, commandSpec);
            result = await resourceMethod(...methodArgs);
        }
        
        return result;
    }

    /**
     * Build method arguments by destructuring args object into parameter order
     */
    buildMethodArguments(args, commandSpec) {
        const methodArgs = [];
        
        // Add parameters in the order they appear in the command spec
        if (commandSpec.parameters) {
            const paramNames = Object.keys(commandSpec.parameters);
            
            for (const paramName of paramNames) {
                methodArgs.push(args[paramName]);
            }
        }
        
        return methodArgs;
    }
}