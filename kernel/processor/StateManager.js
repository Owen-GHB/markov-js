import fs from 'fs';
import path from 'path';
import { Evaluator } from './Evaluator.js';

/**
 * Manages persistent state for the application
 */
export class StateManager {
	constructor(manifest) {
		// Validate manifest parameter
		if (!manifest || typeof manifest !== 'object') {
			throw new Error('StateManager requires a manifest object');
		}

		this.manifest = manifest;
		this.state = new Map(Object.entries(this.manifest.stateDefaults || {}));
		// Don't load state in constructor, only when provided
	}

	/**
	 * Load state from persistent storage
	 */
	loadState(contextFilePath = null) {
		try {
			if (contextFilePath && fs.existsSync(contextFilePath)) {
				const stateData = fs.readFileSync(contextFilePath, 'utf8');
				const savedState = JSON.parse(stateData);
				if (savedState && typeof savedState === 'object') {
					// Load only valid state keys from manifest defaults
					const defaultState = this.manifest.stateDefaults || {};
					for (const [key, defaultValue] of Object.entries(defaultState)) {
						if (key in savedState) {
							this.state.set(key, savedState[key]);
						} else {
							// Ensure defaults are present
							this.state.set(key, defaultValue);
						}
					}
				}
			}
		} catch (error) {
			console.warn(
				'⚠️ Could not load persistent state, using defaults:',
				error.message,
			);
			// Initialize with manifest defaults
			const defaultState = this.manifest.stateDefaults || {};
			for (const [key, value] of Object.entries(defaultState)) {
				this.state.set(key, value);
			}
		}
	}

	/**
	 * Save state to persistent storage
	 */
	saveState(contextFilePath = null) {
		if (!contextFilePath) return; // Don't save if no file path provided
		try {
			// Ensure context directory exists
			const contextDir = path.dirname(contextFilePath);
			if (!fs.existsSync(contextDir)) {
				fs.mkdirSync(contextDir, { recursive: true });
			}

			// Create serializable state object with only the default state keys
			const defaultState = this.manifest.stateDefaults || {};
			const stateToSave = {};

			for (const [key] of Object.entries(defaultState)) {
				if (this.state.has(key)) {
					stateToSave[key] = this.state.get(key);
				}
			}

			fs.writeFileSync(
				contextFilePath,
				JSON.stringify(stateToSave, null, 2),
			);
		} catch (error) {
			console.warn('⚠️ Could not save persistent state:', error.message);
		}
	}

	/**
	 * Get value from state
	 */
	get(key) {
		return this.state.get(key);
	}

	/**
	 * Set value in state
	 */
	set(key, value) {
		this.state.set(key, value);
	}

	/**
	 * Check if key exists in state
	 */
	has(key) {
		return this.state.has(key);
	}

	/**
	 * Delete key from state
	 */
	delete(key) {
		return this.state.delete(key);
	}

	/**
	 * Get the entire state as a Map
	 */
	getStateMap() {
		return this.state;
	}

	/**
	 * Apply side effects to state based on command manifest
	 */
	applySideEffects(command, commandManifest) {
		if (!commandManifest?.sideEffects) return;

		if (commandManifest.sideEffects.setState) {
			for (const [key, rule] of Object.entries(
				commandManifest.sideEffects.setState,
			)) {
				let value;

				if (rule.fromParam && command.args) {
					value = command.args[rule.fromParam];
				}
				if (value === undefined && rule.template && command.args) {
					// Apply template string with available parameters - UPDATED: Use Evaluator
					value = Evaluator.evaluateTemplate(rule.template, { 
						input: command.args,
						state: this.state 
					});
				}

				if (value !== undefined) {
					this.state.set(key, value);
				}
			}
		}

		if (commandManifest.sideEffects.clearState) {
			for (const key of commandManifest.sideEffects.clearState) {
				this.state.delete(key);
			}
		}

		if (commandManifest.sideEffects.clearStateIf) {
			for (const [key, rule] of Object.entries(
				commandManifest.sideEffects.clearStateIf,
			)) {
				if (
					rule.fromParam &&
					command.args &&
					command.args[rule.fromParam] !== undefined
				) {
					const paramValue = command.args[rule.fromParam];
					const stateValue = this.state.get(key);

					// Clear state if the parameter value matches the current state value
					if (paramValue === stateValue) {
						this.state.delete(key);
					}
				}
			}
		}
	}

 /**
   * Applies fallbacks and defaults
   * Assumes arguments have already been validated
   */
  static applyState(args, parameters, context = {}) {
    const normalized = { ...args };
    
    // Step 1: Apply runtime fallbacks
    this.applyRuntimeFallbacks(normalized, parameters, context);
    
    // Step 2: Apply default values
    this.applyDefaultValues(normalized, parameters);
    
    return normalized;
  }

  static applyRuntimeFallbacks(args, parameters, context) {
    for (const [paramName, paramSpec] of Object.entries(parameters)) {
      if (args[paramName] === undefined && 
          paramSpec.runtimeFallback && 
          context.state && 
          context.state.has(paramSpec.runtimeFallback)) {
        args[paramName] = context.state.get(paramSpec.runtimeFallback);
      }
    }
  }

  static applyDefaultValues(args, parameters) {
    for (const [paramName, paramSpec] of Object.entries(parameters)) {
      if (args[paramName] === undefined && 
          !paramSpec.required && 
          paramSpec.default !== undefined) {
        args[paramName] = paramSpec.default;
      }
    }
  }
}

// Export the class, but not the singleton since it now requires a paths parameter
export default StateManager;