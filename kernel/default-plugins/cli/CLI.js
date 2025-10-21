import { Vertex } from 'vertex-kernel';

export class CLI {
  constructor(commandRoot, projectRoot, contextFilePath) {    
    this.contextFilePath = contextFilePath;
    this.commandRoot = commandRoot;
    this.projectRoot = projectRoot;
    
    this.kernel = null;
    this.executor = null;
  }

  async run(args) {
      this.vertex = new Vertex(this.commandRoot, this.projectRoot, this.contextFilePath);
      
      // Handle empty args or help commands
      if (args.length === 0 || this.isHelpRequest(args)) {
          console.log(this.vertex.getHelpText()); // ✅ Built-in help!
          process.exit(0);
      }

      // Handle exit command
      if (this.isExitCommand(args)) {
          console.log('Goodbye!');
          process.exit(0);
      }

      // Execute command
      const input = args.join(' ');
      try {
          const result = await this.vertex.executeCommand(input, 'successOutput');
          console.log(result);
      } catch (err) {
          console.error(`❌ ${err}`);
          process.exit(1);
      }
  }

  // Simple help detection - no fancy parsing needed
  isHelpRequest(args) {
      const firstArg = args[0]?.toLowerCase();
      return firstArg === 'help' || firstArg === '--help' || firstArg === '-h';
  }

  // Simple exit detection  
  isExitCommand(args) {
      const firstArg = args[0]?.toLowerCase();
      return firstArg === 'exit' || firstArg === 'quit';
  }
}