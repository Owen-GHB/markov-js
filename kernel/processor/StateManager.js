import fs from 'fs';
import path from 'path';
import { Evaluator } from './Evaluator.js';

/**
 * Static utilities for state management
 */
export class StateManager {
  /**
   * Load state from persistent storage
   */
  static loadState(contextFilePath, manifest) {
    const state = new Map(Object.entries(manifest.stateDefaults || {}));
    
    try {
      if (contextFilePath && fs.existsSync(contextFilePath)) {
        const stateData = fs.readFileSync(contextFilePath, 'utf8');
        const savedState = JSON.parse(stateData);
        if (savedState && typeof savedState === 'object') {
          const defaultState = manifest.stateDefaults || {};
          for (const [key, defaultValue] of Object.entries(defaultState)) {
            if (key in savedState) {
              state.set(key, savedState[key]);
            } else {
              state.set(key, defaultValue);
            }
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ Could not load persistent state, using defaults:', error.message);
    }
    
    return state;
  }

  /**
   * Save state to persistent storage
   */
  static saveState(state, contextFilePath, manifest) {
    if (!contextFilePath) return;
    
    try {
      const contextDir = path.dirname(contextFilePath);
      if (!fs.existsSync(contextDir)) {
        fs.mkdirSync(contextDir, { recursive: true });
      }

      const defaultState = manifest.stateDefaults || {};
      const stateToSave = {};

      for (const [key] of Object.entries(defaultState)) {
        if (state.has(key)) {
          stateToSave[key] = state.get(key);
        }
      }

      fs.writeFileSync(contextFilePath, JSON.stringify(stateToSave, null, 2));
    } catch (error) {
      console.warn('⚠️ Could not save persistent state:', error.message);
    }
  }

	/**
	 * Apply state-dependent transformations to command arguments
	 */
	static applyState(args, parameters, state = null) {
	if (!state) return args; // No state, no transformations
	
	const normalized = { ...args };
	
	// Apply runtime fallbacks
	for (const [paramName, paramSpec] of Object.entries(parameters)) {
		if (args[paramName] === undefined && 
			paramSpec.runtimeFallback && 
			state.has(paramSpec.runtimeFallback)) {
		normalized[paramName] = state.get(paramSpec.runtimeFallback);
		}
	}
	
	// Apply default values
	for (const [paramName, paramSpec] of Object.entries(parameters)) {
		if (normalized[paramName] === undefined && 
			!paramSpec.required && 
			paramSpec.default !== undefined) {
		normalized[paramName] = paramSpec.default;
		}
	}
	
	return normalized;
	}

  /**
   * Apply side effects to state based on command manifest
   */
  static applySideEffects(command, commandSpec, state) {
    if (!commandSpec?.sideEffects) return;

    if (commandSpec.sideEffects.setState) {
      for (const [key, rule] of Object.entries(commandSpec.sideEffects.setState)) {
        let value;

        if (rule.fromParam && command.args) {
          value = command.args[rule.fromParam];
        }
        if (value === undefined && rule.template && command.args) {
          value = Evaluator.evaluateTemplate(rule.template, { 
            input: command.args,
            state: state 
          });
        }

        if (value !== undefined) {
          state.set(key, value);
        }
      }
    }

    if (commandSpec.sideEffects.clearState) {
      for (const key of commandSpec.sideEffects.clearState) {
        state.delete(key);
      }
    }

    if (commandSpec.sideEffects.clearStateIf) {
      for (const [key, rule] of Object.entries(commandSpec.sideEffects.clearStateIf)) {
        if (rule.fromParam && command.args && command.args[rule.fromParam] !== undefined) {
          const paramValue = command.args[rule.fromParam];
          const stateValue = state.get(key);

          if (paramValue === stateValue) {
            state.delete(key);
          }
        }
      }
    }
  }

  /**
   * Create a new state with defaults
   */
  static createState(manifest) {
    return new Map(Object.entries(manifest.stateDefaults || {}));
  }
}