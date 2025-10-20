import readline from 'readline';
import fs from 'fs';
import { REPLExecutor } from './REPLExecutor.js';

export class REPL {
  constructor() {
    this.executor = null;
    this.rl = null;
    this.history = [];
    this.historyFilePath = null;
    this.maxHistory = 100;
  }

  async start(kernelPath, commandRoot, projectRoot, contextFilePath, historyFilePath, maxHistory) {
    // Store REPL-specific config
    this.historyFilePath = historyFilePath;
    this.maxHistory = maxHistory;

    // Initialize executor (SAME as CLI)
    this.executor = new REPLExecutor(kernelPath, commandRoot, projectRoot, contextFilePath);
    await this.executor.init();
    
    // Access kernel components DIRECTLY
    const { kernel, manifest, state } = this.executor;

    // Load history (REPL handles this itself)
    this.loadHistory();

    // Initialize REPL instance
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: manifest.prompt || '> ',
      completer: (line) => this.commandCompleter(line),
    });

    // Load saved history into readline
    this.rl.history = [...this.history].reverse();

    // Display welcome message
    console.log(`🔗 ${manifest.name} - ${manifest.description}`);
    console.log('='.repeat(Math.max(manifest.name.length + 2, 40)));
    console.log('Type "help()" for available commands or "exit()" to quit.');
    console.log('');

    this.rl.prompt();

    // Handle line input
    this.rl.on('line', async (input) => {
      input = input.trim();

      if (!input) {
        this.rl.prompt();
        return;
      }

      // Add command to history (REPL handles this itself)
      this.addToHistory(input);

      // Handle help command using DIRECT kernel access
      if (kernel.HelpHandler.isHelpCommand(input)) {
        const helpArgs = kernel.HelpHandler.getHelpCommandArgs(input);
        if (helpArgs.command) {
          const cmd = manifest.commands[helpArgs.command];
          if (!cmd) {
            console.error(`❌ Unknown command: ${helpArgs.command}`);
          } else {
            console.log(kernel.HelpHandler.formatCommandHelp(cmd));
          }
        } else {
          console.log(kernel.HelpHandler.formatGeneralHelp(manifest));
        }
        this.rl.prompt();
        return;
      }

      // Handle exit command
      if (kernel.HelpHandler.isExitCommand(input)) {
        console.log('Goodbye!');
        this.rl.close();
        return;
      }

      try {
        // Use executor ONLY for command execution
        const result = await this.executor.executeCommand(input);
        console.log(kernel.formatResult(result));
      } catch (err) {
        console.error(`❌ ${err}`);
      }

      this.rl.prompt();
    });

    this.rl.on('close', () => {
      // Transport handles state persistence directly
      kernel.StateManager.saveState(state, contextFilePath, manifest);
      this.saveHistory(); // REPL handles its own history saving
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
      const contextDir = this.historyFilePath.split('/').slice(0, -1).join('/');
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