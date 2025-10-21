import path from 'path';

export class NativeAdapter {
    constructor(projectRoot) {
        this.projectRoot = projectRoot;
    }

    /**
     * Handle all command types with smart feature detection
     */
    async handle(resourceMethod, command, commandSpec) {
        const { args = {} } = command;
        
        // Handle missing methodName - treat as internal command
        if (!commandSpec.methodName) return true;

        const combineArguments = commandSpec.combineArguments === true;
        const syncMethod = commandSpec.syncMethod === true;
        const shouldResolvePaths = commandSpec.commandType === 'kernel-plugin';

        let result;
        
        if (syncMethod) {
            if (resourceMethod.constructor.name === 'AsyncFunction') {
                console.warn(`⚠️ Method '${commandSpec.methodName}' is declared as sync but is an async function. Falling back to async execution.`);
            } else {
                // Sync execution
                if (combineArguments) {
                    result = resourceMethod(args);
                } else {
                    const methodArgs = this.buildMethodArguments(args, commandSpec, shouldResolvePaths);
                    result = resourceMethod(...methodArgs);
                }
                return result;
            }
        }
        
        // Default async execution (or fallback from above)
        if (combineArguments) {
            result = await resourceMethod(args);
        } else {
            const methodArgs = this.buildMethodArguments(args, commandSpec, shouldResolvePaths);
            result = await resourceMethod(...methodArgs);
        }
        
        return result;
    }

    /**
     * Build method arguments with optional path resolution
     */
    buildMethodArguments(args, commandSpec, shouldResolvePaths) {
        const methodArgs = [];
        
        if (commandSpec.parameters) {
            const paramNames = Object.keys(commandSpec.parameters);
            
            for (const paramName of paramNames) {
                let value = args[paramName];
                
                // Only resolve paths for kernel plugins
                if (shouldResolvePaths && this.shouldResolvePath(value)) {
                    value = path.resolve(this.projectRoot, value);
                }
                
                methodArgs.push(value);
            }
        }
        
        return methodArgs;
    }

    shouldResolvePath(value) {
        if (!value || typeof value !== 'string') return false;
        
        // Resolve relative paths
        return value.startsWith('./') || value.startsWith('../');
    }
}