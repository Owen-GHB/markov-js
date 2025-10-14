// processor/adapters/plugin.js
import { ResourceLoader } from '../../utils/ResourceLoader.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const kernelPath = path.resolve(__dirname, '../../');

export class PluginAdapter {
    constructor(manifest, projectRoot) {
        this.resourceLoader = new ResourceLoader(projectRoot);
        this.manifest = manifest;
        this.projectRoot = projectRoot;
    }

    async handleKernelPlugin(command, commandSpec) {
        const { args = {} } = command;
        const sourcePath = commandSpec.source || './';

        try {
            const method = await this.resourceLoader.getResourceMethod(sourcePath, commandSpec.methodName);
            const result = await method(kernelPath, this.projectRoot, args);
            
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