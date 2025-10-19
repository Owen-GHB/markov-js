import { StateManager } from './StateManager.js';
import { Validator } from './Validator.js';

/**
 * Command processing wrapper
 */
export class Processor {
  /**
   * Process a command through the preparation pipeline
   * Static method - no instance needed!
   */
  static processCommand(command, commandSpec, state = null) {
    const parameters = commandSpec.parameters || {};
    
    // Apply state-dependent transformations
    const processedArgs = StateManager.applyState(command.args, parameters, state);
    
    // Validate (always happens)
    const validatedArgs = Validator.validateAll(command.name, processedArgs, parameters);

    // Return fully processed command
    return {
      ...command,
      args: validatedArgs,
    };
  }
}