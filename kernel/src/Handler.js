import { NativeAdapter } from "./adapters/native.js";

export class Handler {
    constructor(projectRoot) {
        this.projectRoot = projectRoot;
        this.nativeAdapter = new NativeAdapter(projectRoot);
    }

    async handleCommand(command, commandSpec, resourceMethod) {
        // Handle internal commands first (no methodName)
        if (!commandSpec.methodName) {
            return true; // Internal command - just return success
        }

        // Just execute - resource is already resolved!
        return await this.nativeAdapter.handle(resourceMethod, command, commandSpec);
    }
}