import { getHandler, manifest as contractManifest } from '../contract.js';
import { pathToFileURL } from 'url';

export class CommandHandler {
	constructor() {
		// Initialize with the manifest
		this.manifest = contractManifest;
	}

	/**
	 * Handle a parsed command
	 * @param {Object} command - The command object
	 * @returns {Promise<Object>} - The result of the command
	 */
	async handleCommand(command) {
		if (!command) return;
		let result;
		try {
			// Get the command specification from the manifest
			const commandSpec = this.manifest.commands.find(c => c.name === command.name);
			
			if (!commandSpec) {
				return {
					error: `Unknown command: ${command.name}`,
					output: null,
				};
			}
			
			// Handle internal commands declaratively when possible
			if (commandSpec.commandType === 'internal') {
				// Check if this is a fully declarative internal command
				if (commandSpec.successOutput) {
					// Handle declaratively without calling custom handler
					return this.handleInternalCommand(command, commandSpec);
				}
				// Fall back to custom handler for internal commands that need special logic
			}
			
			// Handle external-method commands - auto-handle directly without custom handler lookup
			if (commandSpec.commandType === 'external-method') {
				// Auto-handle external-method command if it has modulePath and methodName
				if (commandSpec.modulePath && commandSpec.methodName) {
					return await this.handleExternalMethod(command, commandSpec);
				} else {
					return {
						error: `External-method command '${command.name}' missing modulePath or methodName in manifest`,
						output: null
					};
				}
			}
			
			// Handle custom commands - look for custom handler files
			const handlerFunction = await getHandler(command.name);
			
			if (handlerFunction && typeof handlerFunction === 'function') {
				// Call the handler function directly with the command arguments
				result = await handlerFunction(command.args);
			} else if (handlerFunction) {
				result = {
					error: `Handler for command '${command.name}' is not a function`,
					output: null,
				};
			} else {
				result = {
					error: `Unknown command: ${command.name}`,
					output: null,
				};
			}
			return result;
		} catch (error) {
			result = {
				error: `Error processing command: ${error.message}`,
				output: null,
			};
			return result;
		}
	}

	/**
	 * Handle a declarative internal command
	 * @param {Object} command - The parsed command object
	 * @param {Object} commandSpec - The command manifest specification
	 * @returns {Object} - The result of the command
	 */
	handleInternalCommand(command, commandSpec) {
		const { args = {} } = command;
		
		// Validate required parameters
		if (commandSpec.parameters) {
			for (const param of commandSpec.parameters) {
				if (param.required && (args[param.name] === undefined || args[param.name] === null)) {
					return {
						error: `Parameter '${param.name}' is required for command '${commandSpec.name}'`,
						output: null
					};
				}
			}
		}
		
		// Generate success output from template if provided
		let output = null;
		if (commandSpec.successOutput) {
			output = this.renderTemplate(commandSpec.successOutput, args);
		}
		
		return {
			error: null,
			output: output
		};
	}

	/**
	 * Handle an external-method command automatically
	 * @param {Object} command - The parsed command object
	 * @param {Object} commandSpec - The command manifest specification
	 * @returns {Promise<Object>} - The result of the command
	 */
	async handleExternalMethod(command, commandSpec) {
		const { args = {} } = command;
		
		try {
			// Use the pre-resolved absolute path from the manifest
			const resolvedModulePath = commandSpec.resolvedAbsolutePath || commandSpec.modulePath;
			
			// Convert to file URL for proper ES module loading
			const moduleUrl = pathToFileURL(resolvedModulePath).href;
			
			// Dynamically import the module
			const module = await import(moduleUrl);
			
			// Get the method from the module
			const method = module[commandSpec.methodName];
			
			if (typeof method !== 'function') {
				return {
					error: `Method '${commandSpec.methodName}' not found or is not a function in module '${resolvedModulePath}'`,
					output: null
				};
			}
			
			// Call the method with the command arguments
			const result = await method(args);
			return result;
		} catch (error) {
			return {
				error: `Failed to execute external method '${commandSpec.methodName}' from '${resolvedModulePath}': ${error.message}`,
				output: null
			};
		}
	}

	/**
	 * Simple template renderer that substitutes {{paramName}} with parameter values
	 * @param {string} template - Template string with {{param}} placeholders
	 * @param {Object} params - Parameter values to substitute
	 * @returns {string} - Rendered template
	 */
	renderTemplate(template, params) {
		if (!template || typeof template !== 'string') {
			return '';
		}
		
		return template.replace(/\{\{([^}]+)\}\}/g, (match, paramName) => {
			const trimmedParamName = paramName.trim();
			if (params && params.hasOwnProperty(trimmedParamName)) {
				return String(params[trimmedParamName]);
			}
			return match; // Keep original placeholder if param not found
		});
	}
}
