export class NativeAdapter {
	/**
	 * Handle all command types with smart feature detection
	 */
	async handle(resourceMethod, command, commandSpec) {
		const { args = {} } = command;

		const combineArguments = commandSpec.combineArguments === true;
		const syncMethod = commandSpec.syncMethod === true;

		let result;

		if (syncMethod) {
			if (resourceMethod.constructor.name === 'AsyncFunction') {
				console.warn(
					`⚠️ Method '${commandSpec.methodName}' is declared as sync but is an async function. Falling back to async execution.`,
				);
			} else {
				// Sync execution
				if (combineArguments) {
					result = resourceMethod(args);
				} else {
					const methodArgs = this.buildMethodArguments(args, commandSpec);
					console.log(methodArgs);
					result = resourceMethod(...methodArgs);
				}
				return result;
			}
		}

		// Default async execution (or fallback from above)
		if (combineArguments) {
			result = await resourceMethod(args);
		} else {
			const methodArgs = this.buildMethodArguments(args, commandSpec);
			result = await resourceMethod(...methodArgs);
		}

		return result;
	}

	/**
	 * Build method arguments with optional path resolution
	 */
	buildMethodArguments(args, commandSpec) {
		const methodArgs = [];

		if (commandSpec.parameters) {
			const paramNames = Object.keys(commandSpec.parameters);

			for (const paramName of paramNames) {
				let value = args[paramName];
				methodArgs.push(value);
			}
		}

		return methodArgs;
	}
}
