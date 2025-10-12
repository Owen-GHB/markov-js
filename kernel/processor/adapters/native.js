import { pathToFileURL } from 'url';
import fs from 'fs';
import path from 'path';

export class NativeAdapter {
	constructor(manifest, projectRoot) {
		// Validate manifest parameter
		if (!manifest || typeof manifest !== 'object') {
			throw new Error('NativeAdapter requires a manifest object');
		}

		// Validate config parameter
		if (projectRoot === null) {
			throw new Error('NativeAdapter requires a projectRoot parameter');
		}

		this.manifest = manifest;
		this.projectRoot = projectRoot;
		
		// Initialize source cache for shared module instances
		this.sourceCache = new Map();
	}

	/**
	 * Get or load a source module
	 * @param {string} sourceSpec - The source name from global.json
	 * @returns {Promise<Object>} - The loaded module
	 */
	async getSource(sourceSpec) {
		// Check if source is already cached
		if (this.sourceCache.has(sourceSpec)) {
			return this.sourceCache.get(sourceSpec);
		}

		// If no source specified, use project root
		let sourcePath;
		if (!sourceSpec) {
			// Default to project root
			sourcePath = './';
		} else {
			// Look up the source path in global manifest
			sourcePath = this.manifest.sources?.[sourceSpec];
			
			if (!sourcePath) {
				throw new Error(`Source '${sourceSpec}' not found in global.json`);
			}
		}

		// Resolve the source path relative to project root
		let resolvedPath;
		if (sourcePath.startsWith('./') || sourcePath.startsWith('../')) {
			// Local path - resolve relative to project root
			const projectRoot = this.projectRoot;
			if (!projectRoot) {
				throw new Error(`Cannot resolve local source '${sourcePath}': projectRoot not available`);
			}
			resolvedPath = path.resolve(projectRoot, sourcePath);
			
			// Handle directory imports (your existing logic)
			if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory()) {
				const packageJsonPath = path.join(resolvedPath, 'package.json');
				if (fs.existsSync(packageJsonPath)) {
					try {
						const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
						if (packageJson.main) {
							resolvedPath = path.resolve(resolvedPath, packageJson.main);
						} else {
							resolvedPath = path.join(resolvedPath, 'index.js');
						}
					} catch (error) {
						resolvedPath = path.join(resolvedPath, 'index.js');
					}
				} else {
					resolvedPath = path.join(resolvedPath, 'index.js');
				}
			}
			
			// Ensure it has .js extension if it's still a file path without one
			if (!resolvedPath.endsWith('.js') && !resolvedPath.endsWith('.mjs')) {
				resolvedPath += '.js';
			}
		} else {
			// npm package - use as-is
			resolvedPath = sourcePath;
		}

		// Check if the resolved file exists
		if (!fs.existsSync(resolvedPath)) {
			throw new Error(`Source file not found: ${resolvedPath}`);
		}

		// Convert to file URL for proper ES module loading
		const moduleUrl = pathToFileURL(resolvedPath).href;

		// Dynamically import the module
		const module = await import(moduleUrl);

		// Cache the module for future use
		this.sourceCache.set(sourceSpec, module);

		return module;
	}

	/**
	 * Handle an native-method command using source resolution with caching
	 * @param {Object} command - The parsed command object
	 * @param {Object} commandSpec - The command manifest specification
	 * @returns {Promise<Object>} - The result of the command
	 */
	async handleNativeMethod(command, commandSpec) {
		const { args = {} } = command;

		try {
			// Get the source spec from the command manifest
			const sourceSpec = commandSpec.source;
			
			if (!sourceSpec) {
				return {
					error: `native-method command '${commandSpec.name}' missing 'source' property in manifest`,
					output: null,
				};
			}

			// Get the module from cache or load it
			const module = await this.getSource(sourceSpec);

			// Get the method from the module
			const method = module[commandSpec.methodName];

			// Check if method exists with better error reporting
			if (typeof method !== 'function') {
				const availableMethods = Object.keys(module).filter(key => typeof module[key] === 'function');
				return {
					error: `Method '${commandSpec.methodName}' not found in source '${sourceSpec}'. Available methods: ${availableMethods.join(', ') || 'none'}`,
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
				error: `Failed to execute native method '${commandSpec.methodName}' from source '${commandSpec.source}': ${error.message}`,
				output: null,
			};
		}
	}
}