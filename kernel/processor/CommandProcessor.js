import { CommandHandler } from './handler/CommandHandler.js';
import { StateManager } from './StateManager.js';
import { Validator } from './normalizer/Validator.js';
import { Evaluator } from './Evaluator.js';

/**
 * Consolidates shared command processing logic across all transports
 */
export class CommandProcessor {
	constructor(commandRoot, projectRoot, manifest) {
		// Validate config parameter
		if (!projectRoot) {
			throw new Error('CommandProcessor requires a projectRoot parameter');
		}

		// Validate manifest parameter
		if (!manifest || typeof manifest !== 'object') {
			throw new Error('CommandProcessor requires a manifest object');
		}

		this.manifest = manifest;
		this.stateManager = new StateManager(manifest);
		// Pass the full config to CommandHandler
		this.handler = new CommandHandler(commandRoot, projectRoot, manifest);
		this.state = this.stateManager.getStateMap();
	}

	/**
	 * Process a command and apply side effects manually
	 */
	async processStatefulCommand(
		command, 
		chainContext = { 
			originalCommand: command,
			previousCommand: command
		}
	) {
		try {
			// Get command specification
			const commandSpec = this.manifest.commands[command.name];

			if (!commandSpec) {
				return {
					error: `Unknown command: ${command.name}`,
					output: null,
				};
			}

			const parameters = commandSpec.parameters || {};
			const context = {
				input: chainContext.previousCommand.args,
				state: this.state,
				manifest: this.manifest,
				previous: chainContext.previousCommand.name,
				original: chainContext.originalCommand.name
			};

			// Normalize parameters (provide fallbacks/defaults first)
			const statefulArgs = this.stateManager.applyState(command.args, parameters, context);
			const statefulCommand = {
				...command,
				args: statefulArgs,
			};

			const result = await this.processCommand(statefulCommand);

			// Apply side effects if command was successful
			if (!result.error) {
				this.stateManager.applySideEffects(statefulCommand, commandSpec);
				
				// Check for command chaining with conditionals
				if (commandSpec.next) {
					const nextCommand = this.constructNextCommand(
						commandSpec.next, 
						{
							input: chainContext.previousCommand.args,
							output: result.output,
							previous: chainContext.previousCommand.name,
							original: chainContext.originalCommand.name
						}
					);
					
					if (nextCommand) {
						// Recursively process the chain with updated context
						return await this.processStatefulCommand(nextCommand, {
							originalCommand: chainContext.originalCommand, // Preserve original
							previousCommand: command // Update previous to current command
						});
					}
				}
			}
			
			return result;

		} catch (error) {
			return {
				error: `Chain failed at '${command.name}': ${error.message}`,
				output: null,
			};
		}
	}

	/**
	 * Process a command without state management
	 */
	async processCommand(command) {
		const commandSpec = this.manifest.commands[command.name];
		const parameters = commandSpec.parameters || {};
		const validatedArgs = Validator.validateAll(command.name, command.args, parameters);
		if (validatedArgs.error) {
			return { error: validatedArgs.error, output: null };
		}
		const processedCommand = {
			...command,
			args: validatedArgs.args,
		};
		const result = await this.handler.handleCommand(processedCommand);
		return result;
	}

	/**
	 * Construct next command with optional conditional evaluation
	 */
	constructNextCommand(nextConfig, contexts) {
		try {
			// Iterate through all commands in 'next' (maintaining property order)
			const entries = Object.entries(nextConfig);
			
			for (const [nextCommandName, nextCommandConfig] of entries) {
				if (!nextCommandConfig || typeof nextCommandConfig !== 'object') continue;

				// Evaluate condition if present - UPDATED: Use Evaluator
				let shouldExecute = true;
				if (nextCommandConfig.when) {
					shouldExecute = Evaluator.evaluateConditional(nextCommandConfig.when, contexts);
				}

				// If condition passes (or no condition), execute this command
				if (shouldExecute) {
					// Resolve parameters using enhanced template system - UPDATED: Use Evaluator
					const resolvedArgs = {};
					for (const [paramName, paramConfig] of Object.entries(nextCommandConfig.parameters || {})) {
						if (paramConfig.resolve) {
							const resolvedValue = Evaluator.evaluateTemplate(paramConfig.resolve, contexts);
							
							// Parse JSON if the resolved value looks like JSON
							try {
								resolvedArgs[paramName] = JSON.parse(resolvedValue);
							} catch {
								resolvedArgs[paramName] = resolvedValue;
							}
						}
					}

					return {
						name: nextCommandName,
						args: resolvedArgs
					};
				}
				// If condition fails, continue to next command (fallthrough)
			}

			// All conditions failed = stop chain by returning null
			return null;

		} catch (error) {
			throw new Error(`Failed to construct next command: ${error.message}`);
		}
	}

	// REMOVED: evaluateConditional and normalizeConditionalValue methods (now in Evaluator)

	/**
	 * Get the manifest
	 */
	getManifest() {
		return this.manifest;
	}
}