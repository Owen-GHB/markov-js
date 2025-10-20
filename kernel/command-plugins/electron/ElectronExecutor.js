import path from 'path';
import { pathToFileURL } from 'url';

export class ElectronExecutor {
  constructor(kernelPath, commandRoot, projectRoot) {
    this.kernelPath = kernelPath;
    this.commandRoot = commandRoot; // Still needed for runner, but NOT for manifest
    this.projectRoot = projectRoot; // Use this for manifest loading
    
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
    
    // Initialize core components - CRITICAL: use projectRoot for manifest
    this.manifest = this.kernel.manifestReader(this.projectRoot);
    this.runner = new this.kernel.Runner(this.commandRoot, this.projectRoot, this.manifest);
  }
  
  /**
   * Simplified execute method for Electron
   * Takes pre-parsed command object, returns raw result
   * No parsing, no success templates - just execution
   */
  async executeCommand(command) {
    const { kernel, manifest, runner } = this;
    
    try {
      // Command is already parsed by the time it reaches Electron
      const commandSpec = manifest.commands[command.name];
      
      // Execute with the pre-parsed command object
      const result = await runner.runCommand(command, commandSpec);
      
      // Return raw result - no success template application
      return result;
    } catch (err) {
      throw err;
    }
  }
}