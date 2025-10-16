// File: processor/CommandProcessor.js

import { CommandHandler } from './handler/CommandHandler.js';
import { StateManager } from './StateManager.js';
import { Validator } from './normalizer/Validator.js';
import { Normalizer } from './normalizer/Normalizer.js';

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
	 * @param {Object} command - The parsed command object
	 * @param {string|null} contextFilePath - Path to context file for state management (default: null, uses default state)
	 * @returns {Promise<Object>} - The result of command processing
	 */
	async processStatefulCommand(
		command, 
		chainContext = { 
			originalCommand: command,    // NEW: Track the very first command
			previousCommand: command     // NEW: Track the previous command (starts as current)
		}
	) {
		try {
			// Get command specification
			const commandSpec = this.manifest.commands.find((c) => c.name === command.name);

			if (!commandSpec) {
				return {
					error: `Unknown command: ${command.name}`,
					output: null,
				};
			}

			const parameters = commandSpec.parameters || {};
			const context = {
				// CHANGED: input now correctly maps to previous command's args
				input: chainContext.previousCommand.args,
				state: this.state,
				manifest: this.manifest,
				// NEW: Add previous and original command names
				previous: chainContext.previousCommand.name,
				original: chainContext.originalCommand.name
			};

			// Normalize parameters (provide fallbacks/defaults first)
			const normalizedArgs = Normalizer.normalizeAll(command.args, parameters, context);
			const normalizedCommand = {
				...command,
				args: normalizedArgs,
			};

			const result = await this.processCommand(normalizedCommand);

			// Apply side effects if command was successful
			if (!result.error) {
				this.stateManager.applySideEffects(normalizedCommand, commandSpec);
				
				// Check for command chaining with conditionals
				if (commandSpec.next) {
					const nextCommand = this.constructNextCommand(
						commandSpec.next, 
						// CHANGED: Pass enhanced context instead of just originalInput
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
	 * @param {Object} command - The parsed command object
	 * @returns {Promise<Object>} - The result of command processing
	 */
	async processCommand(command) {
		const commandSpec = this.manifest.commands.find((c) => c.name === command.name);
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

				// Evaluate condition if present (missing 'when' = always true)
				let shouldExecute = true;
				if (nextCommandConfig.when) {
					shouldExecute = this.evaluateConditional(nextCommandConfig.when, contexts);
				}

				// If condition passes (or no condition), execute this command
				if (shouldExecute) {
					// Resolve parameters using enhanced template system
					const resolvedArgs = {};
					for (const [paramName, paramConfig] of Object.entries(nextCommandConfig.parameters || {})) {
						if (paramConfig.resolve) {
							const resolvedValue = this.stateManager.evaluateTemplate(paramConfig.resolve, contexts);
							
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

	/**
	 * Evaluate conditional expressions with template resolution
	 * Supports: ==, !=, >, <
	 * Malformed expressions return false (safe fallthrough)
	 */
	evaluateConditional(expression, contexts = {}) {
		try {
			// Resolve templates first
			const resolvedExpression = this.stateManager.evaluateTemplate(expression, contexts);
			
			// Find the first matching operator
			const operators = ['==', '!=', '>', '<'];
			let foundOperator = null;
			
			for (const op of operators) {
				if (resolvedExpression.includes(op)) {
					foundOperator = op;
					break;
				}
			}

			// If no operator found, treat as truthy check
			if (!foundOperator) {
				const expr = this.normalizeConditionalValue(resolvedExpression);
				return Boolean(expr);
			}

			// Split into left and right parts
			const [leftStr, rightStr] = resolvedExpression.split(foundOperator).map(part => part.trim());
			
			if (!leftStr || !rightStr) {
				return false; // Malformed expression
			}

			// Let JavaScript handle type coercion
			const left = this.normalizeConditionalValue(leftStr);
			const right = this.normalizeConditionalValue(rightStr);

			// Evaluate based on operator
			switch (foundOperator) {
				case '==':
					return left == right; // Intentional loose equality
				case '!=':
					return left != right; // Intentional loose equality
				case '>':
					return left > right;
				case '<':
					return left < right;
				default:
					return false; // Unknown operator
			}

		} catch (error) {
			// Any error during evaluation = false (safe fallthrough)
			return false;
		}
	}

	/**
	 * Normalize values for conditional evaluation
	 * Attempts to convert to numbers/booleans, falls back to strings
	 */
	normalizeConditionalValue(value) {
		// Handle numeric values
		if (/^-?\d+$/.test(value)) {
			return parseInt(value, 10);
		}
		if (/^-?\d+\.\d+$/.test(value)) {
			return parseFloat(value);
		}
		
		// Handle booleans
		if (value.toLowerCase() === 'true') return true;
		if (value.toLowerCase() === 'false') return false;
		if (value.toLowerCase() === 'null') return null;
		if (value.toLowerCase() === 'undefined') return undefined;
		
		// Return as string
		return value;
	}

	/**
	 * Get the manifest
	 * @returns {Object} - The application manifest
	 */
	getManifest() {
		return this.manifest;
	}
}