import path from 'path';
import { pathToFileURL } from 'url';

export class REPLExecutor {
  constructor(kernelPath, commandRoot, projectRoot, contextFilePath) {
    this.kernelPath = kernelPath;
    this.commandRoot = commandRoot;
    this.projectRoot = projectRoot; 
    this.contextFilePath = contextFilePath;
    
    // These will be set in init()
    this.kernel = null;    // All kernel exports
    this.manifest = null;  // Loaded manifest
    this.state = null;     // Current state
    this.runner = null;    // Command runner
  }
  
  async init() {
    // Proper path resolution
    const exportsPath = path.join(this.kernelPath, 'exports.js');
    const exportsUrl = pathToFileURL(exportsPath).href;
    
    // Single dynamic import
    this.kernel = await import(exportsUrl);
    
    // Initialize core components
    this.manifest = this.kernel.manifestReader(this.commandRoot);
    this.state = this.kernel.StateManager.loadState(this.contextFilePath, this.manifest);
    this.runner = new this.kernel.Runner(this.commandRoot, this.projectRoot, this.manifest);
    this.runner.setState(this.state);
  }
  
  /**
   * ONLY method besides constructor/init
   * Handles command execution - identical to CLIExecutor
   */
  async executeCommand(input) {
    const { kernel, manifest, runner, state } = this;
    
    try {
      const commandName = kernel.Parser.extractCommandName(input);
      const commandSpec = manifest.commands[commandName];
      const command = kernel.Parser.parseCommand(input, commandSpec);
      let result = await runner.runCommand(command, commandSpec, state);
      
      if (commandSpec?.successOutput) {
        const templateContext = {
          input: command.args,
          output: result,
          state: state,
          original: command.args,
          originalCommand: command.name
        };
        result = kernel.Evaluator.evaluateTemplate(commandSpec.successOutput, templateContext);
      }
      
      return result;
    } catch (err) {
      throw err;
    }
  }
}