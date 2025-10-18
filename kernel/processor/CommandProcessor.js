import { CommandHandler } from './handler/CommandHandler.js';
import { StateManager } from './StateManager.js';
import { Validator } from './Validator.js';
import { Evaluator } from './Evaluator.js';

/**
 * Unified command processor - state is optional
 */
export class CommandProcessor {
  constructor(commandRoot, projectRoot, manifest) {
    if (!projectRoot) {
      throw new Error('CommandProcessor requires a projectRoot parameter');
    }
    if (!manifest || typeof manifest !== 'object') {
      throw new Error('CommandProcessor requires a manifest object');
    }

    this.manifest = manifest;
    this.handler = new CommandHandler(commandRoot, projectRoot, manifest);
    this.state = StateManager.createState(manifest); // Internal state for side effects
  }

  /**
   * Process a command through the preparation pipeline (synchronous)
   * @returns fully processed command object ready for execution
   * @throws error if validation fails
   */
  processCommand(command, state = null) {
    const commandSpec = this.manifest.commands[command.name];
    if (!commandSpec) {
      throw new Error(`Unknown command: ${command.name}`);
    }

    // Use provided state or internal state for processing
    const processingState = state !== null && state !== undefined ? state : this.state;

    const parameters = commandSpec.parameters || {};
    
    // Apply state-dependent transformations
    const processedArgs = StateManager.applyState(command.args, parameters, processingState);
    
    // Validate (always happens)
    const validatedArgs = Validator.validateAll(command.name, processedArgs, parameters);
    if (validatedArgs.error) {
      throw new Error(validatedArgs.error);
    }

    // Return fully processed command
    return {
      ...command,
      args: validatedArgs.args,
    };
  }

  /**
   * Run a command through full pipeline including execution and side effects
   */
  async runCommand(command, state = null, chainContext = null) {
    // Initialize chain context if this is the first command in a chain
    const isChainStart = !chainContext;
    if (isChainStart) {
      chainContext = {
        originalCommand: command,
        previousCommand: command
      };
    }

    try {
      const commandSpec = this.manifest.commands[command.name];
      
      // Use provided state or internal state
      const effectiveState = state !== null && state !== undefined ? state : this.state;

      // STEP 1: Process command through preparation pipeline
      const processedCommand = this.processCommand(command, effectiveState);

      // STEP 2: Execute command
      const result = await this.handler.handleCommand(processedCommand);

      // Build unified template context
      const templateContext = {
        input: processedCommand.args,
        output: result.output,
        state: effectiveState,
        previous: chainContext.previousCommand.name,
        original: chainContext.originalCommand.args,
        originalCommand: chainContext.originalCommand.name
      };

      // STEP 3: Apply success output template if command successful
      if (!result.error && commandSpec.successOutput) {
        result.output = Evaluator.evaluateTemplate(commandSpec.successOutput, templateContext);
      }

      // STEP 4: Apply side effects if command successful
      if (!result.error) {
        StateManager.applySideEffects(processedCommand, commandSpec, effectiveState, templateContext);
      }

      // STEP 5: Handle command chaining if command successful
      if (!result.error && commandSpec?.next) {
        const nextCommand = this.constructNextCommand(
          commandSpec.next, 
          templateContext // Pass the same unified context
        );
        
        if (nextCommand) {
          // Recursively run with same state but updated context
          return await this.runCommand(nextCommand, state, {
            originalCommand: chainContext.originalCommand,
            previousCommand: command
          });
        }
      }

      return result;

    } catch (error) {
      const contextInfo = isChainStart ? '' : ` in chain starting with '${chainContext.originalCommand.name}'`;
      return {
        error: `Command '${command.name}' failed${contextInfo}: ${error.message}`,
        output: null,
      };
    }
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