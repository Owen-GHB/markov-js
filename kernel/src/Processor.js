import { StateManager } from './StateManager.js';
import { Validator } from './Validator.js';

/**
 * Unified command processor - state is optional
 */
export class Processor {
  constructor(commandRoot, projectRoot, manifest) {
    if (!projectRoot) {
      throw new Error('CommandProcessor requires a projectRoot parameter');
    }
    if (!manifest || typeof manifest !== 'object') {
      throw new Error('CommandProcessor requires a manifest object');
    }

    this.manifest = manifest;
  }

  /**
   * Process a command through the preparation pipeline
   * @returns fully processed command object ready for execution
   * @throws error if validation fails
   */
  processCommand(command, state = null) {
    const commandSpec = this.manifest.commands[command.name];
    if (!commandSpec) {
      throw new Error(`Unknown command: ${command.name}`);
    }

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