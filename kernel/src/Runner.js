import { Handler } from './Handler.js';
import { Evaluator } from './Evaluator.js';
import { Validator } from './Validator.js';
import { loadManifest } from './loaders/manifestLoader.js';
import { StateManager } from './StateManager.js';
import { ResourceLoader } from './loaders/ResourceLoader.js';
import { Specifier } from './Specifier.js';

/**
 * Runs the command chain
 */
export class Runner {
	constructor(commandRoot) {
		this.resourceLoader = new ResourceLoader(commandRoot);
		this.handler = new Handler();
		this.manifest = loadManifest(commandRoot); // Need manifest for next command lookup
	}

	/**
	 * Run a command and handle full chain execution
	 */
	async runCommand(command, commandSpec, originalCommand = null) {
		const argsWithDefaults = StateManager.applyParameterDefaults(
			command.args,
			commandSpec.parameters,
		);
		const validatedArgs = Validator.validateAll(
			command.name,
			argsWithDefaults,
			commandSpec.parameters,
		);
		command.args = validatedArgs;
		if (!originalCommand) originalCommand = command;

		// Execute current command
		const resourceMethod = await this.resolveResource(command, commandSpec);
		const result = await this.handler.handleCommand(
			command,
			commandSpec,
			resourceMethod,
		);

		// Build template context for chaining
		const templateContext = {
			input: command.args,
			output: result,
			original: originalCommand.args,
			originalCommand: originalCommand.name,
		};

		// Check for next command in chain
		let nextCommand = null;
		if (commandSpec?.next) {
			nextCommand = this.constructNextCommand(
				commandSpec.next,
				templateContext,
			);
		}

		// If there's a next command, recursively execute the chain
		if (nextCommand) {
			const nextCommandSpec = Specifier.specifyCommand(nextCommand, this.manifest, true);
			if (!nextCommandSpec) {
				throw new Error(`Unknown next command: ${nextCommand.name}`);
			}

			// Recursively execute the chain
			return await this.runCommand(
				nextCommand,
				nextCommandSpec,
				originalCommand || command,
			);
		}

		// End of chain, return final result
		return result;
	}

	async resolveResource(command, commandSpec) {
		if (!commandSpec.methodName) {
			return null;
		}

		const sourcePath = commandSpec.source || './';
		return await this.resourceLoader.getResourceMethod(
			sourcePath,
			commandSpec.methodName,
		);
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
