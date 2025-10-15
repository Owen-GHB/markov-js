import { ResourceLoader } from './ResourceLoader.js';

export class NativeAdapter {
    constructor(commandRoot, projectRoot, manifest) {
        this.resourceLoader = new ResourceLoader(projectRoot);
        this.manifest = manifest;
        this.commandRoot = commandRoot;
        this.projectRoot = projectRoot;
    }

    async handleNativeMethod(command, commandSpec) {
        const { args = {} } = command;
        const sourcePath = commandSpec.source || './';
        const combineArguments = commandSpec.combineArguments === true;
        const syncMethod = commandSpec.syncMethod === true;

        try {
            const method = await this.resourceLoader.getResourceMethod(sourcePath, commandSpec.methodName);
            
            let result;
            
            if (syncMethod) {
                // Single-line obvious async detection
                if (method.constructor.name === 'AsyncFunction') {
                    console.warn(`⚠️ Method '${commandSpec.methodName}' is declared as sync but is an async function. Falling back to async execution.`);
                    // Fall through to async execution
                } else {
                    // Trust the user - synchronous execution
                    if (combineArguments) {
                        result = method(args);
                    } else {
                        const methodArgs = this.buildMethodArguments(args, commandSpec);
                        result = method(...methodArgs);
                    }
                    return { error: null, output: result };
                }
            }
            
            // Default async execution (or fallback from above)
            if (combineArguments) {
                result = await method(args);
            } else {
                const methodArgs = this.buildMethodArguments(args, commandSpec);
                result = await method(...methodArgs);
            }
            
            return { error: null, output: result };
            
        } catch (error) {
            const sourceInfo = commandSpec.source ? `from source '${commandSpec.source}'` : 'from default project root';
            return {
                error: `Failed to execute native method '${commandSpec.methodName}' ${sourceInfo}: ${error.message}`,
                output: null,
            };
        }
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