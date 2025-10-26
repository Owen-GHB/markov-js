import fs from 'fs';
import path from 'path';
import { Template } from './Template.js';

export class State {
  static properties = ['stateDefaults', 'runtimeFallback', 'sideEffects'];
  
  constructor(options = {}) {
    this.contextFilePath = options.contextFilePath || null;
    this.manifest = options.manifest;
    this.state = this.loadInitialState();
  }

  loadInitialState() {
    const state = new Map(Object.entries(this.manifest.stateDefaults || {}));

    try {
      if (this.contextFilePath && fs.existsSync(this.contextFilePath)) {
        const stateData = fs.readFileSync(this.contextFilePath, 'utf8');
        const savedState = JSON.parse(stateData);
        if (savedState && typeof savedState === 'object') {
          const defaultState = this.manifest.stateDefaults || {};
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
      console.warn(
        '⚠️ Could not load persistent state, using defaults:',
        error.message,
      );
    }

    return state;
  }

  saveState() {
    if (!this.contextFilePath) return;

    try {
      const contextDir = path.dirname(this.contextFilePath);
      if (!fs.existsSync(contextDir)) {
        fs.mkdirSync(contextDir, { recursive: true });
      }

      const defaultState = this.manifest.stateDefaults || {};
      const stateToSave = {};

      for (const [key] of Object.entries(defaultState)) {
        if (this.state.has(key)) {
          stateToSave[key] = this.state.get(key);
        }
      }

      fs.writeFileSync(this.contextFilePath, JSON.stringify(stateToSave, null, 2));
    } catch (error) {
      console.warn('⚠️ Could not save persistent state:', error.message);
    }
  }

  applyRuntimeFallbacks(args, parameters) {
    const normalized = { ...args };

    for (const [paramName, paramSpec] of Object.entries(parameters)) {
      if (
        args[paramName] === undefined &&
        paramSpec.runtimeFallback &&
        this.state.has(paramSpec.runtimeFallback)
      ) {
        normalized[paramName] = this.state.get(paramSpec.runtimeFallback);
      }
    }

    return normalized;
  }

  applySideEffects(command, commandSpec, templateContext = {}) {
    if (!commandSpec?.sideEffects) return this.state;

    // Use Template's static methods for evaluation
    if (commandSpec.sideEffects.setState) {
      for (const [key, rule] of Object.entries(commandSpec.sideEffects.setState)) {
        let value;
        if (value === undefined && rule) {
          value = Template.evaluateTemplate(rule, templateContext);
        }
        if (value !== undefined) {
          this.state.set(key, value);
        }
      }
    }

    if (commandSpec.sideEffects.clearState) {
      for (const key of commandSpec.sideEffects.clearState) {
        this.state.delete(key);
      }
    }

    if (commandSpec.sideEffects.clearStateIf) {
      for (const [key, condition] of Object.entries(commandSpec.sideEffects.clearStateIf)) {
        try {
          const shouldClear = Template.evaluateConditional(condition, templateContext);
          if (shouldClear) {
            this.state.delete(key);
          }
        } catch (error) {
          console.warn(
            `⚠️ Failed to evaluate clearStateIf condition for '${key}':`,
            error.message,
          );
        }
      }
    }

    return this.state;
  }

  /**
   * Processor interface
   */
  async preProcess(context) {
    const { command, commandSpec } = context;
    
    if (command && commandSpec) {
      const processedArgs = this.applyRuntimeFallbacks(
        command.args,
        commandSpec.parameters
      );
      
      return {
        ...context,
        command: { ...command, args: processedArgs },
        state: this.state
      };
    }
    
    return { ...context, state: this.state };
  }

  async postProcess(context) {
    const { command, commandSpec, result } = context;
    
    if (commandSpec?.sideEffects) {
      const templateContext = {
        input: command.args,
        output: result,
        state: this.state,
      };
      
      this.applySideEffects(command, commandSpec, templateContext);
    }
    
    this.saveState();
    
    return context;
  }
}