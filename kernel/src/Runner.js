import { Handler } from './Handler.js';
import { StateManager } from './StateManager.js';
import { Evaluator } from './Evaluator.js';

/**
 * Stateless command processor - all state management handled by caller
 */
export class Runner {
	constructor(commandRoot, projectRoot) {
		if (!projectRoot) {
			throw new Error('Runner requires a projectRoot parameter');
		}
		this.handler = new Handler(commandRoot, projectRoot);
	}

	/**
	 * Run a single command and return result with updated state and optional next command
	 */
	async runCommand(command, commandSpec, state, originalCommand = null) {
		// Execute command
		const result = await this.handler.handleCommand(
			command,
			commandSpec,
		);

		// Build template context for side effects and chaining
		const templateContext = {
			input: command.args,
			output: result,
			state: state,
			original: originalCommand ? originalCommand.args : command.args,
			originalCommand: originalCommand ? originalCommand.name : command.name,
		};

		// Apply side effects and get updated state
		const updatedState = StateManager.applySideEffects(
			command,
			commandSpec,
			state,
			templateContext,
		);

		// Construct next command if specified
		let nextCommand = null;
		if (commandSpec?.next) {
			nextCommand = this.constructNextCommand(
				commandSpec.next,
				templateContext,
			);
		}

		return { result, updatedState, nextCommand };
	}

	/**
	 * Construct next command with optional conditional evaluation
	 */
	constructNextCommand(nextConfig, contexts) {
		try {
			const entries = Object.entries(nextConfig);

			for (const [nextCommandName, nextCommandConfig] of entries) {
				if (!nextCommandConfig || typeof nextCommandConfig !== 'object')
					continue;

				let shouldExecute = true;
				if (nextCommandConfig.when) {
					shouldExecute = Evaluator.evaluateConditional(
						nextCommandConfig.when,
						contexts,
					);
				}

				if (shouldExecute) {
					const resolvedArgs = {};
					for (const [paramName, paramConfig] of Object.entries(
						nextCommandConfig.parameters || {},
					)) {
						if (paramConfig.resolve) {
							const resolvedValue = Evaluator.evaluateTemplate(
								paramConfig.resolve,
								contexts,
							);
							try {
								resolvedArgs[paramName] = JSON.parse(resolvedValue);
							} catch {
								resolvedArgs[paramName] = resolvedValue;
							}
						}
					}

					return {
						name: nextCommandName,
						args: resolvedArgs,
					};
				}
			}

			return null;
		} catch (error) {
			throw new Error(`Failed to construct next command: ${error.message}`);
		}
	}
}