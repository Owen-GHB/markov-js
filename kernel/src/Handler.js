import { NativeAdapter } from './adapters/native.js';

export class Handler {
	constructor() {
		this.nativeAdapter = new NativeAdapter();
	}

	async handleCommand(command, commandSpec, resourceMethod) {
		// Handle state-only commands (no methodName) by returning success
		if (!commandSpec.methodName || resourceMethod === null) {
			return true; // No code for to execute - just return success
		}

		// Just execute - resource is already resolved!
		return await this.nativeAdapter.handle(
			resourceMethod,
			command,
			commandSpec,
		);
	}
}
