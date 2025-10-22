import readline from 'readline';
import fs from 'fs';
import path from 'path';
import { Vertex } from 'vertex-kernel';

export class REPL {
  constructor() {
    this.executor = null;
    this.rl = null;
    this.history = [];
    this.historyFilePath = null;
    this.maxHistory = 100;
  }

  async start(commandRoot, projectRoot, contextFilePath, historyFilePath, maxHistory) {
      // Store REPL-specific config
      this.historyFilePath = historyFilePath;
      this.maxHistory = maxHistory;
      
      // Create vertex instance
      this.vertex = new Vertex(commandRoot, projectRoot, contextFilePath);
      
      // Get manifest for welcome message and completer
      const manifest = this.vertex.manifest;

      // Load history
      this.loadHistory();

      // Initialize REPL instance
      this.rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
          prompt: manifest.prompt || '> ',
          completer: (line) => this.commandCompleter(line),
      });

      // Load saved history
      this.rl.history = [...this.history].reverse();

      // Display welcome message
      console.log(`🔗 ${manifest.name} - ${manifest.description}`);
      console.log('='.repeat(Math.max(manifest.name.length + 2, 40)));
      console.log('Type "help" for available commands or "exit" to quit.');
      console.log('');

      this.rl.prompt();

      // Handle line input - EVEN SIMPLER!
      this.rl.on('line', async (input) => {
          input = input.trim();

          if (!input) {
              this.rl.prompt();
              return;
          }

          // Add to history
          this.addToHistory(input);

          // Handle simple meta-commands
          if (input === 'help' || input === 'help()') {
              console.log(this.vertex.getHelpText()); // ✅ Built-in help!
              this.rl.prompt();
              return;
          }

          if (input === 'exit' || input === 'exit()') {
              console.log('Goodbye!');
              this.rl.close();
              return;
          }

          // Everything else gets executed as a command
          try {
              const result = await this.vertex.executeCommand(input, 'successOutput');
              console.log(result);
          } catch (err) {
              console.error(`❌ ${err}`);
          }

          this.rl.prompt();
      });

      this.rl.on('close', () => {
          this.saveHistory();
          process.exit(0);
      });

      process.on('SIGINT', () => {
          console.log('\nUse "exit" or Ctrl+D to quit.');
          this.rl.prompt();
      });
  }

  // REPL-specific methods (stay in transport)
  loadHistory() {
    try {
      if (fs.existsSync(this.historyFilePath)) {
        const historyData = fs.readFileSync(this.historyFilePath, 'utf8');
        const savedHistory = JSON.parse(historyData);
        if (Array.isArray(savedHistory)) {
          this.history = savedHistory.slice(-this.maxHistory);
        }
      }
    } catch (error) {
      console.warn('⚠️ Could not load REPL history:', error.message);
      this.history = [];
    }
  }

  saveHistory() {
      try {
          const contextDir = path.dirname(this.historyFilePath);
          if (!fs.existsSync(contextDir)) {
              fs.mkdirSync(contextDir, { recursive: true });
          }
          fs.writeFileSync(this.historyFilePath, JSON.stringify(this.history, null, 2));
      } catch (error) {
          console.warn('⚠️ Could not save REPL history:', error.message);
      }
  }

  addToHistory(input) {
    if (input.trim()) {
      if (this.history.length === 0 || this.history[this.history.length - 1] !== input.trim()) {
        this.history.push(input.trim());
        if (this.history.length > this.maxHistory) {
          this.history = this.history.slice(-this.maxHistory);
        }
        this.saveHistory();
      }
    }
  }

  commandCompleter(line) {
    const commands = [
      ...Object.keys(this.executor.manifest.commands),
      'help',
      'exit',
    ];
    const hits = commands.filter((c) => c.startsWith(line));
    return [hits.length ? hits : commands, line];
  }
}