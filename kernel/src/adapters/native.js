import { ResourceLoader } from '../ResourceLoader.js';

export class NativeAdapter {
    constructor(commandRoot, projectRoot, manifest) {
        this.resourceLoader = new ResourceLoader(projectRoot);
        this.manifest = manifest;
    }

    async handleNativeMethod(command, commandSpec) {
        const { args = {} } = command;
        const sourcePath = commandSpec.source || './';
        const combineArguments = commandSpec.combineArguments === true;
        const syncMethod = commandSpec.syncMethod === true;

        // Handle missing methodName - treat as internal command
        if (!commandSpec.methodName) return true;

        const method = await this.resourceLoader.getResourceMethod(sourcePath, commandSpec.methodName);
        
        let result;
        
        if (syncMethod) {
            if (method.constructor.name === 'AsyncFunction') {
                console.warn(`⚠️ Method '${commandSpec.methodName}' is declared as sync but is an async function. Falling back to async execution.`);
            } else {
                if (combineArguments) {
                    result = method(args);
                } else {
                    const methodArgs = this.buildMethodArguments(args, commandSpec);
                    result = method(...methodArgs);
                }
                return result;
            }
        }
        
        // Default async execution (or fallback from above)
        if (combineArguments) {
            result = await method(args);
        } else {
            const methodArgs = this.buildMethodArguments(args, commandSpec);
            result = await method(...methodArgs);
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