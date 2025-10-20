import { CLIExecutor } from './CLIExecutor.js';

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
    
    this.executor = null;
  }

  async run(args) {
    // Initialize executor
    this.executor = new CLIExecutor(this.kernelPath, this.commandRoot, this.projectRoot, this.contextFilePath);
    await this.executor.init();
    
    // Access kernel components DIRECTLY
    const { kernel, manifest, state } = this.executor;

    if (args.length === 0) {
      console.log(kernel.HelpHandler.formatGeneralHelp(manifest));
      process.exit(0);
    }

    const input = args.join(' ');

    if (kernel.HelpHandler.isHelpCommand(input)) {
      const helpArgs = kernel.HelpHandler.getHelpCommandArgs(input);
      if (helpArgs.command) {
        const cmd = manifest.commands[helpArgs.command];
        if (!cmd) {
          console.error(`❌ Unknown command: ${helpArgs.command}`);
          console.log(kernel.HelpHandler.formatGeneralHelp(manifest));
          process.exit(1);
        }
        console.log(kernel.HelpHandler.formatCommandHelp(cmd));
      } else {
        console.log(kernel.HelpHandler.formatGeneralHelp(manifest));
      }
      process.exit(0);
    }

    if (kernel.HelpHandler.isExitCommand(input)) {
      console.log('Goodbye!');
      process.exit(0);
    }

    try {
      // Use executor ONLY for command execution
      const result = await this.executor.executeCommand(input);
      
      // Transport handles state persistence directly
      kernel.StateManager.saveState(state, this.contextFilePath, manifest);
      
      console.log(kernel.formatResult(result));
    } catch (err) {
      console.error(`❌ ${err}`);
      process.exit(1);
    }
  }
}