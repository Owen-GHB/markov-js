import { ResourceLoader } from '../ResourceLoader.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const kernelPath = path.resolve(__dirname, '../../');

export class PluginAdapter {
    constructor(commandRoot, projectRoot) {
        this.resourceLoader = new ResourceLoader(commandRoot);
        this.commandRoot = commandRoot;
        this.projectRoot = projectRoot;
    }

    async handleKernelPlugin(command, commandSpec) {
        const { args = {} } = command;
        const sourcePath = commandSpec.source || './';

        const method = await this.resourceLoader.getResourceMethod(sourcePath, commandSpec.methodName);           
        const methodArgs = await this.buildMethodArguments(args, commandSpec);          
        const result = await method(...methodArgs);
        
        return result;
    }

    /**
     * Build method arguments based on command spec parameter order
     */
    async buildMethodArguments(args, commandSpec) {
        const methodArgs = [kernelPath, this.commandRoot, this.projectRoot];
        
        // Add parameters in the order they appear in the command spec
        if (commandSpec.parameters) {
            const paramNames = Object.keys(commandSpec.parameters);
            
            for (const paramName of paramNames) {
                let value = args[paramName];
                
                // Resolve relative paths to absolute paths relative to projectRoot
                if (this.shouldResolvePath(value)) {
                    value = path.resolve(process.cwd(), value);
                }
                
                methodArgs.push(value);
            }
        }
        
        return methodArgs;
    }

    /**
     * Determine if a parameter value should be resolved as a path
     */
    shouldResolvePath(value) {
        if (!value || typeof value !== 'string') return false;
        
        // Resolve if it's a relative path (starts with ./ or ../)
        if (value.startsWith('./') || value.startsWith('../')) {
            return true;
        }
        
        return false;
    }
}