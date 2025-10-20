import path from 'path';
import { pathToFileURL } from 'url';

export class HTTPExecutor {
  constructor(kernelPath, commandRoot, projectRoot) {
    this.kernelPath = kernelPath;
    this.commandRoot = commandRoot;
    this.projectRoot = projectRoot;
    
    // These will be set in init()
    this.kernel = null;    // All kernel exports
    this.manifest = null;  // Loaded manifest
    this.runner = null;    // Command runner
  }
  
  async init() {
    // Proper path resolution
    const exportsPath = path.join(this.kernelPath, 'exports.js');
    const exportsUrl = pathToFileURL(exportsPath).href;
    
    // Single dynamic import
    this.kernel = await import(exportsUrl);
    
    // Initialize core components
    this.manifest = this.kernel.manifestReader(this.projectRoot);
    this.runner = new this.kernel.Runner(this.commandRoot, this.projectRoot, this.manifest);
  }
  
  /**
   * Execute command with optional file arguments
   * @param {string} commandString - JSON command string from HTTP request
   * @param {Object} fileArgs - File arguments object {fieldName: fileData} (optional)
   * @returns {Promise<any>} - Command execution result
   */
    async executeCommand(input, template = null) {
    const { kernel, manifest, runner } = this;
    
    const commandObject = kernel.Processor.parseInput(input, manifest);
    const commandSpec = manifest.commands[commandObject.name];
    let result = await runner.runCommand(commandObject, commandSpec);
    
    if (template && commandSpec?.[template]) {
        const templateContext = {
        input: commandObject.args,
        output: result,
        state: this.state || new Map(),
        original: commandObject.args,
        originalCommand: commandObject.name
        };
        result = kernel.Evaluator.evaluateTemplate(commandSpec[template], templateContext);
    }
    
    return result;
    }
}