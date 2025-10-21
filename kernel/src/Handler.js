import { ResourceLoader } from "./ResourceLoader.js";
import { NativeAdapter } from "./adapters/native.js";
import { PluginAdapter } from "./adapters/plugin.js";

export class Handler {
    constructor(commandRoot, projectRoot) {
        this.commandRoot = commandRoot;
        this.projectRoot = projectRoot;
        
        // Two clear resource domains:
        this.resourceLoader = new ResourceLoader(projectRoot);      // Native methods (user code)
        this.kernelResourceLoader = new ResourceLoader(commandRoot); // Kernel plugins (system code)
        
        // Simple, focused adapters
        this.nativeAdapter = new NativeAdapter();
        this.pluginAdapter = new PluginAdapter(projectRoot);
    }

    async handleCommand(command, commandSpec) {
        // Handle internal commands first (no methodName)
        if (!commandSpec.methodName) {
            return true; // Internal command - just return success
        }

        // Only load resources for commands that need them
        const resource = await this.resolveResource(command, commandSpec);
        
        // Then delegate to appropriate adapter
        if (commandSpec.commandType === 'native-method') {
            return await this.nativeAdapter.handle(resource, command, commandSpec);
        } else if (commandSpec.commandType === 'kernel-plugin') {
            return await this.pluginAdapter.handle(resource, command, commandSpec);
        }
        
        throw new Error(`Unknown command type: ${commandSpec.commandType}`);
    }

    async resolveResource(command, commandSpec) {
        // This should only be called for commands with methodName
        if (!commandSpec.methodName) {
            throw new Error(`Command ${command.name} has no methodName`);
        }

        const sourcePath = commandSpec.source || './';
        const resourceLoader = this.getResourceLoader(commandSpec.commandType);
        
        return await resourceLoader.getResourceMethod(
            sourcePath, commandSpec.methodName
        );
    }

    getResourceLoader(commandType) {
        // Clear mapping:
        switch (commandType) {
            case 'native-method':
                return this.resourceLoader;          // User's project code
            case 'kernel-plugin':
                return this.kernelResourceLoader;    // System plugin code
            default:
                throw new Error(`No resource loader for type: ${commandType}`);
        }
    }
}