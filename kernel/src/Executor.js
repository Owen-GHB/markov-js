import { Processor } from './Processor.js';
import { Evaluator } from './Evaluator.js';
import { Runner } from './Runner.js';
import { StateManager } from './StateManager.js';
import { manifestReader } from './manifestReader.js';

export class Executor {
  constructor(commandRoot, projectRoot, contextFilePath = null) {
    this.commandRoot = commandRoot;
    this.projectRoot = projectRoot;
    this.contextFilePath = contextFilePath;
    
    // Initialize core components
    this.manifest = manifestReader(commandRoot);
    this.runner = new Runner(commandRoot, projectRoot);
    
    // Load state if context file provided
    this.state = contextFilePath 
      ? StateManager.loadState(contextFilePath, this.manifest)
      : StateManager.createState(this.manifest);
  }

  async executeCommand(input, template = null) {
    const processedInput = Processor.processInput(input, this.manifest);
    const commandSpec = this.manifest.commands[processedInput.name];
    const commandObject = Processor.processCommand(processedInput, commandSpec, this.state);

    
    // Execute command chain recursively
    const { result: chainResult, finalState } = await this.executeCommandChain(
      commandObject,
      commandSpec,
      this.state,
      commandObject  // original command for chain context
    );
    
    // Update our final state
    this.state = finalState;
    
    let finalResult = chainResult;
    
    // Apply template if specified
    if (template && commandSpec?.[template]) {
      const templateContext = {
        input: commandObject.args,
        output: finalResult,
        state: this.state,
        original: commandObject.args,
        originalCommand: commandObject.name
      };
      finalResult = Evaluator.evaluateTemplate(commandSpec[template], templateContext);
    }
    
    // Save state if we have a context file
    if (this.contextFilePath) {
      StateManager.saveState(this.state, this.contextFilePath, this.manifest);
    }
    
    return finalResult;
  }

  /**
   * Recursively execute command chain
   */
  async executeCommandChain(currentCommand, currentCommandSpec, currentState, originalCommand) {
    // Run single command and get result with updated state and potential next command
    const { result, updatedState, nextCommand } = await this.runner.runCommand(
      currentCommand,
      currentCommandSpec,
      currentState,
      originalCommand
    );

    // Handle command chaining recursively
    if (nextCommand) {
      const nextCommandSpec = this.manifest.commands[nextCommand.name];
      if (!nextCommandSpec) {
        throw new Error(`Unknown next command: ${nextCommand.name}`);
      }
      return await this.executeCommandChain(
        nextCommand,
        nextCommandSpec,
        updatedState,
        originalCommand
      );
    }

    // No more commands in chain, return final result and state
    return { result, finalState: updatedState };
  }

  /**
   * Get the current state (for inspection/debugging)
   */
  getState() {
    return new Map(this.state); // Return a copy
  }

  /**
   * Manually save state (for explicit persistence)
   */
  saveState() {
    if (this.contextFilePath) {
      StateManager.saveState(this.state, this.contextFilePath, this.manifest);
    }
  }
}