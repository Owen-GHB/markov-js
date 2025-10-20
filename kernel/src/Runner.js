import { Handler } from './Handler.js';
import { StateManager } from './StateManager.js';
import { Processor } from './Processor.js';
import { Evaluator } from './Evaluator.js';

/**
 * Unified command processor - state is optional
 */
export class Runner {
	constructor(commandRoot, projectRoot, manifest) {
		if (!projectRoot) {
			throw new Error('Runner requires a projectRoot parameter');
		}
		if (!manifest || typeof manifest !== 'object') {
			throw new Error('Runner requires a manifest object');
		}

		this.manifest = manifest;
		this.handler = new Handler(commandRoot, projectRoot);
		this.state = StateManager.createState(manifest);
	}

	async runCommand(command, commandSpec, state = null, originalCommand = null) {
		// Initialize chain context if this is the first command
		if (!originalCommand) originalCommand = command;

		// Use provided state or internal state
		const effectiveState =
			state !== null && state !== undefined ? state : this.state;

		// Run single command and get result with potential next command
		const { result, nextCommand } = await this.runSingleCommand(
			command,
			commandSpec,
			effectiveState,
			originalCommand,
		);

		// Handle command chaining recursively
		if (nextCommand) {
			const nextCommandSpec = this.manifest.commands[nextCommand.name];
			return await this.runCommand(
				nextCommand,
				nextCommandSpec,
				effectiveState,
				originalCommand,
			);
		}

		return result;
	}

	/**
	 * Run a single command and return result with optional next command
	 */
	async runSingleCommand(command, commandSpec, state, originalCommand) {
		// Process command through preparation pipeline
		const processedCommand = Processor.processCommand(
			command,
			commandSpec,
			state,
		);

		// Execute command
		const result = await this.handler.handleCommand(
			processedCommand,
			commandSpec,
		);

		// Build template context for side effects and chaining
		const templateContext = {
			input: processedCommand.args,
			output: result,
			state: state,
			original: originalCommand.args,
			originalCommand: originalCommand.name,
		};

		// Apply side effects
		this.state = StateManager.applySideEffects(
			processedCommand,
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

		return { result, nextCommand };
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

	/**
	 * Get the current state (for transports that need to persist it)
	 */
	getState() {
		return this.state;
	}

	/**
	 * Set the state (for transports that manage persistence)
	 */
	setState(state) {
		this.state = state;
	}
}
