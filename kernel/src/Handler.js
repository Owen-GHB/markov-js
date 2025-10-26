import { NativeAdapter } from './adapters/native.js';
import { ResourceLoader } from './loaders/ResourceLoader.js';

export class Handler {
	constructor(commandRoot) {
		this.nativeAdapter = new NativeAdapter();
		this.resourceLoader = new ResourceLoader(commandRoot);
	}

	async handleCommand(command, commandSpec) {
		// Handle state-only commands (no methodName) by returning success
		if (!commandSpec.methodName) {
			return true; // No code to execute - just return success
		}

		// Resolve and execute the resource
		const resourceMethod = await this.resolveResource(command, commandSpec);
		return await this.nativeAdapter.handle(
			resourceMethod,
			command,
			commandSpec,
		);
	}

	async resolveResource(command, commandSpec) {
		const sourcePath = commandSpec.source || './';
		return await this.resourceLoader.getResourceMethod(
			sourcePath,
			commandSpec.methodName,
		);
	}
}