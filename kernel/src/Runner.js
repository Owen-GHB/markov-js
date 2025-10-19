import { Handler } from './Handler.js';
import { StateManager } from './StateManager.js';
import { Processor } from './Processor.js';
import { Evaluator } from './Evaluator.js';

/**
 * Unified command processor - state is optional
 */
export class Runner {
  constructor(commandRoot, projectRoot, manifest) {
    if (!projectRoot) {
      throw new Error('Runner requires a projectRoot parameter');
    }
    if (!manifest || typeof manifest !== 'object') {
      throw new Error('Runner requires a manifest object');
    }

    this.manifest = manifest;
    this.handler = new Handler(commandRoot, projectRoot);
    this.state = StateManager.createState(manifest); // Internal state for side effects
  }

  async runCommand(command, commandSpec, state = null, originalCommand) {
    // Initialize chain context if this is the first command in a chain
    if (!originalCommand) originalCommand = command;
    
    // Use provided state or internal state
    const effectiveState = state !== null && state !== undefined ? state : this.state;

    // Process command through preparation pipeline
    const processedCommand = Processor.processCommand(command, commandSpec, effectiveState);

    // Execute command
    const result = await this.handler.handleCommand(processedCommand, commandSpec); 
    
    // Build template context (for side effects and chaining)
    const templateContext = {
      input: processedCommand.args,
      output: result,
      state: effectiveState,
      original: originalCommand.args,
      originalCommand: originalCommand.name
    };

    // Apply side effects
    this.state = StateManager.applySideEffects(processedCommand, commandSpec, effectiveState, templateContext);

    // Handle command chaining
    if (commandSpec?.next) {
      const nextCommand = this.constructNextCommand(commandSpec.next, templateContext);
      if (nextCommand) {
        return await this.runCommand(nextCommand, state, originalCommand);
      }
    }

    return result;
  }

  /**
   * Construct next command with optional conditional evaluation
   */
  constructNextCommand(nextConfig, contexts) {
    try {
      const entries = Object.entries(nextConfig);
      
      for (const [nextCommandName, nextCommandConfig] of entries) {
        if (!nextCommandConfig || typeof nextCommandConfig !== 'object') continue;

        let shouldExecute = true;
        if (nextCommandConfig.when) {
          shouldExecute = Evaluator.evaluateConditional(nextCommandConfig.when, contexts);
        }

        if (shouldExecute) {
          const resolvedArgs = {};
          for (const [paramName, paramConfig] of Object.entries(nextCommandConfig.parameters || {})) {
            if (paramConfig.resolve) {
              const resolvedValue = Evaluator.evaluateTemplate(paramConfig.resolve, contexts);
              try {
                resolvedArgs[paramName] = JSON.parse(resolvedValue);
              } catch {
                resolvedArgs[paramName] = resolvedValue;
              }
            }
          }

          return {
            name: nextCommandName,
            args: resolvedArgs
          };
        }
      }

      return null;

    } catch (error) {
      throw new Error(`Failed to construct next command: ${error.message}`);
    }
  }

  /**
   * Get the manifest
   */
  getManifest() {
    return this.manifest;
  }

  /**
   * Get the current state (for transports that need to persist it)
   */
  getState() {
    return this.state;
  }

  /**
   * Set the state (for transports that manage persistence)
   */
  setState(state) {
    this.state = state;
  }
}