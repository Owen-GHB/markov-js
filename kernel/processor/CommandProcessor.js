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
	async processStatefulCommand(command, chainContext = { originalInput: command.args }) {
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
		state: this.state,
		manifest: this.manifest,
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
		
		// ✅ NEW: Check for command chaining
		if (commandSpec.next) {
			const nextCommand = this.constructNextCommand(
			commandSpec.next, 
			chainContext.originalInput, 
			result.output
			);
			
			if (nextCommand) {
			// Recursively process the chain with accumulated state
			return await this.processStatefulCommand(nextCommand, chainContext);
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
	 * Construct the next command in a chain using template resolution
	 */
	constructNextCommand(nextConfig, originalInput, previousOutput) {
	try {
		// nextConfig structure: { "nextCommandName": { "parameters": { ... } } }
		const [nextCommandName, nextCommandConfig] = Object.entries(nextConfig)[0];
		
		if (!nextCommandConfig || !nextCommandConfig.parameters) {
		throw new Error(`Invalid chain configuration for ${nextCommandName}`);
		}

		// Resolve parameters using enhanced template system
		const resolvedArgs = {};
		for (const [paramName, paramConfig] of Object.entries(nextCommandConfig.parameters)) {
		if (paramConfig.resolve) {
			const resolvedValue = this.stateManager.evaluateTemplate(paramConfig.resolve, {
			input: originalInput,
			output: previousOutput
			});
			
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

	} catch (error) {
		throw new Error(`Failed to construct next command: ${error.message}`);
	}
	}

	/**
	 * Get the manifest
	 * @returns {Object} - The application manifest
	 */
	getManifest() {
		return this.manifest;
	}
}