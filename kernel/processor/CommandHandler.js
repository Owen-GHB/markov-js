import { pathToFileURL } from 'url';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class CommandHandler {
	constructor(manifest, config = {}) {
		// Validate manifest parameter
		if (!manifest || typeof manifest !== 'object') {
			throw new Error('CommandHandler requires a manifest object');
		}

		// Validate config parameter
		if (typeof config !== 'object' || config === null) {
			throw new Error('CommandHandler requires a config object');
		}

		// Extract contractDir from paths in config
		if (!config.paths || !config.paths.contractDir) {
			throw new Error(
				'CommandHandler config requires paths.contractDir property',
			);
		}

		this.manifest = manifest;
		this.config = config;
		this.contractDir = config.paths.contractDir;
		
		// Initialize dependency cache for shared module instances
		this.dependencyCache = new Map();
	}

	/**
	 * Handle a parsed command
	 * @param {Object} command - The command object
	 * @returns {Promise<Object>} - The result of the command
	 */
	async handleCommand(command) {
		if (!command) return;
		
		try {
			// Get the command specification from the manifest
			const commandSpec = this.manifest.commands.find(
				(c) => c.name === command.name,
			);

			if (!commandSpec) {
				return {
					error: `Unknown command: ${command.name}`,
					output: null,
				};
			}

			// Handle internal commands declaratively
			if (commandSpec.commandType === 'internal') {
				return this.handleInternalCommand(command, commandSpec);
			}

			// Handle external-method commands using dependency system
			if (commandSpec.commandType === 'external-method') {
				return await this.handleExternalMethod(command, commandSpec);
			}

			// If we get here, it's an unknown command type
			return {
				error: `Unknown command type '${commandSpec.commandType}' for command '${command.name}'`,
				output: null,
			};
		} catch (error) {
			return {
				error: `Error processing command: ${error.message}`,
				output: null,
			};
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
			for (const paramName in commandSpec.parameters) {
				const param = commandSpec.parameters[paramName];
				if (
					param.required &&
					(args[paramName] === undefined || args[paramName] === null)
				) {
					return {
						error: `Parameter '${paramName}' is required for command '${commandSpec.name}'`,
						output: null,
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
			output: output,
		};
	}

	/**
	 * Get or load a dependency module
	 * @param {string} dependencySpec - The dependency name from global.json
	 * @returns {Promise<Object>} - The loaded module
	 */
	async getDependency(dependencySpec) {
		// Check if dependency is already cached
		if (this.dependencyCache.has(dependencySpec)) {
			return this.dependencyCache.get(dependencySpec);
		}

		// Look up the dependency path in global manifest
		const dependencyPath = this.manifest.dependencies?.[dependencySpec];
		
		if (!dependencyPath) {
			throw new Error(`Dependency '${dependencySpec}' not found in global.json`);
		}

		// Resolve the dependency path relative to project root if it's a local path
		let resolvedPath;
		if (dependencyPath.startsWith('./') || dependencyPath.startsWith('../')) {
			// Local path - resolve relative to project root
			const projectRoot = this.config.paths?.projectRoot;
			if (!projectRoot) {
				throw new Error(`Cannot resolve local dependency '${dependencySpec}': projectRoot not available`);
			}
			resolvedPath = path.resolve(projectRoot, dependencyPath);
		} else {
			// npm package - use as-is (Node.js will resolve it)
			resolvedPath = dependencyPath;
		}

		// Convert to file URL for proper ES module loading
		const moduleUrl = pathToFileURL(resolvedPath).href;

		// Dynamically import the module using Node.js native resolution
		const module = await import(moduleUrl);

		// Cache the module for future use
		this.dependencyCache.set(dependencySpec, module);

		return module;
	}

	/**
	 * Handle an external-method command using dependency resolution with caching
	 * @param {Object} command - The parsed command object
	 * @param {Object} commandSpec - The command manifest specification
	 * @returns {Promise<Object>} - The result of the command
	 */
	async handleExternalMethod(command, commandSpec) {
		const { args = {} } = command;

		try {
			// Get the dependency spec from the command manifest
			const dependencySpec = commandSpec.source;
			
			if (!dependencySpec) {
				return {
					error: `External-method command '${commandSpec.name}' missing 'source' property in manifest`,
					output: null,
				};
			}

			// Get the module from cache or load it
			const module = await this.getDependency(dependencySpec);

			// Get the method from the module
			const method = module[commandSpec.methodName];

			// Check if method exists with better error reporting
			if (typeof method !== 'function') {
				const availableMethods = Object.keys(module).filter(key => typeof module[key] === 'function');
				return {
					error: `Method '${commandSpec.methodName}' not found in dependency '${dependencySpec}'. Available methods: ${availableMethods.join(', ') || 'none'}`,
					output: null,
				};
			}

			// Call the method with the command arguments
			try {
				const result = await method(args);
				// Treat the result as success output
				return {
					error: null,
					output: result,
				};
			} catch (methodError) {
				// If the method throws an error, convert it to the expected format
				return {
					error: methodError.message,
					output: null,
				};
			}
		} catch (error) {
			return {
				error: `Failed to execute external method '${commandSpec.methodName}' from dependency '${commandSpec.source}': ${error.message}`,
				output: null,
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

	/**
	 * Get cached dependency count (for debugging/monitoring)
	 * @returns {number} - Number of cached dependencies
	 */
	getCachedDependencyCount() {
		return this.dependencyCache.size;
	}

	/**
	 * Get list of cached dependencies (for debugging/monitoring)
	 * @returns {string[]} - Array of cached dependency names
	 */
	getCachedDependencies() {
		return Array.from(this.dependencyCache.keys());
	}

	/**
	 * Clear the dependency cache (useful for development/reloading)
	 */
	clearCache() {
		this.dependencyCache.clear();
	}
}