import { importVertex } from './imports.js';

export class CLI {
  constructor(kernelPath, commandRoot, projectRoot, contextFilePath) {
    if (!contextFilePath) {
      throw new Error('CLI requires a contextFilePath property');
    }
    if (!kernelPath) {
      throw new Error('CLI requires a kernelPath property');
    }
    
    this.contextFilePath = contextFilePath;
    this.kernelPath = kernelPath;
    this.commandRoot = commandRoot;
    this.projectRoot = projectRoot;
    
    this.kernel = null;
    this.executor = null;
  }

  async run(args) {
    // Initialize Vertex and kernel utilities
    const Vertex = await importVertex(this.kernelPath);
    this.kernel = new Vertex();
    
    // Create executor first
    this.executor = new this.kernel.Executor(this.commandRoot, this.projectRoot, this.contextFilePath);
    
    // Load initial state from disk and set it in executor's runner
    const manifest = this.kernel.manifestReader(this.commandRoot);
    this.executor.runner.state = this.kernel.StateManager.loadState(this.contextFilePath, manifest);

    if (args.length === 0) {
      console.log(this.kernel.HelpHandler.formatGeneralHelp(manifest));
      process.exit(0);
    }

    const input = args.join(' ');

    if (this.kernel.HelpHandler.isHelpCommand(input)) {
      const helpArgs = this.kernel.HelpHandler.getHelpCommandArgs(input);
      if (helpArgs.command) {
        const cmd = manifest.commands[helpArgs.command];
        if (!cmd) {
          console.error(`❌ Unknown command: ${helpArgs.command}`);
          console.log(this.kernel.HelpHandler.formatGeneralHelp(manifest));
          process.exit(1);
        }
        console.log(this.kernel.HelpHandler.formatCommandHelp(cmd));
      } else {
        console.log(this.kernel.HelpHandler.formatGeneralHelp(manifest));
      }
      process.exit(0);
    }

    if (this.kernel.HelpHandler.isExitCommand(input)) {
      console.log('Goodbye!');
      process.exit(0);
    }

    try {
      const result = await this.executor.executeCommand(input, 'successOutput');
      console.log(this.kernel.formatResult(result));
    } catch (err) {
      console.error(`❌ ${err}`);
      process.exit(1);
    }
  }
}