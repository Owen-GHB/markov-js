// processor/adapters/native.js
import { ResourceLoader } from '../../utils/ResourceLoader.js';

export class NativeAdapter {
    constructor(manifest, projectRoot) {
        this.resourceLoader = new ResourceLoader(projectRoot);
        this.manifest = manifest;
        this.projectRoot = projectRoot;
    }

    async handleNativeMethod(command, commandSpec) {
        const { args = {} } = command;
        const sourcePath = commandSpec.source || './';

        try {
            // DIRECT - no intermediate methods needed
            const method = await this.resourceLoader.getResourceMethod(sourcePath, commandSpec.methodName);
            const result = await method(args);
            
            return {
                error: null,
                output: result,
            };
        } catch (error) {
            const sourceInfo = commandSpec.source ? `from source '${commandSpec.source}'` : 'from default project root';
            return {
                error: `Failed to execute native method '${commandSpec.methodName}' ${sourceInfo}: ${error.message}`,
                output: null,
            };
        }
    }
}