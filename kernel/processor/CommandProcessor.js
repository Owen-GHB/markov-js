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
	async processParsedCommand(command, contextFilePath = null) {
		try {
			// Get command specification
			const commandSpec = this.manifest.commands.find(
				(c) => c.name === command.name,
			);

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

			// STEP 1: Normalize parameters (provide fallbacks/defaults first)
			const normalizationResult = Normalizer.normalizeAll(command.args, parameters, context);
			if (normalizationResult.error) {
				return { error: normalizationResult.error, output: null };
			}

			// STEP 2: Validate parameters (check normalized values)
			const validationResult = Validator.validateAll(command.name, normalizationResult.args, parameters);
			if (validationResult.error) {
				return { error: validationResult.error, output: null };
			}

			// Update command with normalized+validated args
			const processedCommand = {
				...command,
				args: validationResult.args,
			};

			// STEP 3: Execute the command
			const result = await this.handler.handleCommand(processedCommand);

			// Apply side effects and save state if command was successful
			if (!result.error && contextFilePath !== null) {
				this.stateManager.applySideEffects(processedCommand, commandSpec);
				this.stateManager.saveState(contextFilePath);
			}

			return result;

		} catch (error) {
			return {
				error: `Command processing error: ${error.message}`,
				output: null,
			};
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