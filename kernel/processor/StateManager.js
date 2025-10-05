import fs from 'fs';
import path from 'path';

/**
 * Manages persistent state for the application
 */
export class StateManager {
  constructor(paths, manifest) {
    if (!paths || typeof paths !== 'object' || !paths.contextFilePath) {
      throw new Error('StateManager requires a paths object with contextFilePath property');
    }
    
    // Validate manifest parameter
    if (!manifest || typeof manifest !== 'object') {
      throw new Error('StateManager requires a manifest object');
    }
    
    this.manifest = manifest;
    this.state = new Map(Object.entries(this.manifest.stateDefaults || {}));
    this.stateFilePath = paths.contextFilePath;
    this.loadState();
  }

  /**
   * Load state from persistent storage
   */
  loadState() {
    try {
      if (fs.existsSync(this.stateFilePath)) {
        const stateData = fs.readFileSync(this.stateFilePath, 'utf8');
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
      console.warn('⚠️ Could not load persistent state, using defaults:', error.message);
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
  saveState() {
    try {
      // Ensure context directory exists
      const contextDir = path.dirname(this.stateFilePath);
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
      
      fs.writeFileSync(this.stateFilePath, JSON.stringify(stateToSave, null, 2));
    } catch (error) {
      console.warn('⚠️ Could not save persistent state:', error.message);
    }
  }

  /**
   * Get value from state
   * @param {string} key - State key
   * @returns {*} Value or undefined if not set
   */
  get(key) {
    return this.state.get(key);
  }

  /**
   * Set value in state
   * @param {string} key - State key
   * @param {*} value - Value to set
   */
  set(key, value) {
    this.state.set(key, value);
  }

  /**
   * Check if key exists in state
   * @param {string} key - State key
   * @returns {boolean} True if key exists
   */
  has(key) {
    return this.state.has(key);
  }

  /**
   * Delete key from state
   * @param {string} key - State key to delete
   */
  delete(key) {
    return this.state.delete(key);
  }

  /**
   * Get the entire state as a Map
   * @returns {Map} Current state
   */
  getStateMap() {
    return this.state;
  }

  /**
   * Apply side effects to state based on command manifest
   * @param {Object} command - Command object
   * @param {Object} commandManifest - Manifest for the executed command
   */
  applySideEffects(command, commandManifest) {
    if (!commandManifest?.sideEffects) return;

    if (commandManifest.sideEffects.setState) {
      for (const [key, rule] of Object.entries(commandManifest.sideEffects.setState)) {
        let value;
        
        if (rule.fromParam && command.args) {
          value = command.args[rule.fromParam];
        }
        if (value === undefined && rule.template && command.args) {
          // Apply template string with available parameters
          value = this.evaluateTemplate(rule.template, command.args);
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
      for (const [key, rule] of Object.entries(commandManifest.sideEffects.clearStateIf)) {
        if (rule.fromParam && command.args && command.args[rule.fromParam] !== undefined) {
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
   * Helper to evaluate template strings
   * @private
   */
  evaluateTemplate(template, bag) {
    return template.replace(/\{\{(\w+)(?:\s*\|\s*(\w+))?\}\}/g, (_, key, filter) => {
      let val = bag[key];
      if (val === undefined) return '';
      
      if (filter === 'basename') {
        val = String(val).replace(/\.[^/.]+$/, '');
      }
      
      return String(val);
    });
  }
}

// Export the class, but not the singleton since it now requires a paths parameter
export default StateManager;