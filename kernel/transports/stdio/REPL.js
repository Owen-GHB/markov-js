import readline from 'readline';
import fs from 'fs';
import path from 'path';
import pathResolver from '../../utils/path-resolver.js';
import stateManager from '../../utils/StateManager.js';
import { CommandHandler } from '../../CommandHandler.js';
import { CommandParser } from '../../CommandParser.js';
import { manifest } from '../../contract.js';
import { HelpCommand } from './commands/help.js';
import { ExitCommand } from './commands/exit.js';

// Load configuration for history
let config = { repl: { maxHistory: 100 } }; // fallback default
try {
  const configPath = pathResolver.getConfigFilePath('default.json');
  if (fs.existsSync(configPath)) {
    const configFile = fs.readFileSync(configPath, 'utf8');
    const loadedConfig = JSON.parse(configFile);
    config = { ...config, ...loadedConfig };
  }
} catch (error) {
  console.warn('⚠️ Could not load config for REPL history, using defaults:', error.message);
}

export class REPL {
	constructor() {
		this.handler = new CommandHandler();
		this.commandParser = new CommandParser();
		this.maxHistory = config.repl.maxHistory || 100;
		this.history = [];
		this.historyFilePath = pathResolver.getContextFilePath('repl-history.json');
		this.loadHistory();
		// Use shared state manager
		this.state = stateManager.getStateMap();
		this.helpCommand = new HelpCommand();
		this.exitCommand = new ExitCommand();
	}

	async start() {
		// Initialize REPL instance
		this.rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
			prompt: manifest.prompt || '> ', // Use prompt from manifest or default fallback
			completer: (line) => this.commandCompleter(line),
		});

		// Load saved history into readline's history array for up/down navigation
		this.rl.history = [...this.history].reverse(); // Reverse to match readline's order (newest first)

		// Display welcome message and prompt
		console.log(`🔗 ${manifest.name} - ${manifest.description}`);
		console.log('='.repeat(Math.max(manifest.name.length + 2, 40)));
		console.log('Type "help()" for available commands or "exit()" to quit.');
		console.log('');

		this.rl.prompt();

		// Handle line input
		this.rl.on('line', async (input) => {
			input = input.trim();
			
			// Handle empty input
			if (!input) {
				this.rl.prompt();
				return;
			}

			// Add command to history
			this.addToHistory(input);

			// Handle built-in commands
			if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'exit()') {
				console.log('Goodbye!');
				this.rl.close();
				return;
			}

			if (input.toLowerCase() === 'help' || input.toLowerCase() === 'help()') {
				const helpContext = { manifest };
				const result = await this.helpCommand.handle({ name: 'help', args: {} }, helpContext);
				if (result.output) console.log(result.output);
				this.rl.prompt();
				return;
			}

			// Create context with state for the parser
			const context = { state: this.state, manifest };
			const parsed = this.commandParser.parse(input, context);
			
			if (parsed.error) {
				console.error(`❌ ${parsed.error}`);
				this.rl.prompt();
				return;
			}

			const command = parsed.command;
			
			// Handle built-in commands with parameters
			if (command.name === 'help') {
				const helpContext = { manifest };
				const result = await this.helpCommand.handle(command, helpContext);
				if (result.output) console.log(result.output);
				this.rl.prompt();
				return;
			}
			
			if (command.name === 'exit') {
				console.log('Goodbye!');
				this.rl.close();
				return;
			}

			// Handle regular commands
			const result = await this.handler.handleCommand(command);

			if (result.error) console.error(`❌ ${result.error}`);
			if (result.output) console.log(result.output);

			this.applySideEffects(command);
			stateManager.saveState();
			this.rl.prompt();
		});

		this.rl.on('close', () => {
			console.log('\nGoodbye!');
			process.exit(0);
		});

		process.on('SIGINT', () => {
			console.log('\nUse "exit" or Ctrl+D to quit.');
			this.rl.prompt();
		});
	}

	applySideEffects(cmd) {
		// Handle built-in exit command
		if (cmd.name === 'exit') {
			this.rl.close();
			return;
		}

		// Use the shared state manager to apply side effects for regular commands
		const spec = manifest.commands.find((c) => c.name === cmd.name);
		if (spec) {
			stateManager.applySideEffects(cmd, spec);
		}
	}

	/* ---------- unchanged helpers ---------- */
	commandCompleter(line) {
		// Include built-in commands in completion
		const commands = [...manifest.commands.map((c) => c.name), 'help', 'exit'];
		const hits = commands.filter((c) => c.startsWith(line));
		return [hits.length ? hits : commands, line];
	}
	
	addToHistory(input) {
		if (input.trim()) {
			// Add to history if it's not a duplicate of the last entry
			if (this.history.length === 0 || this.history[this.history.length - 1] !== input.trim()) {
				this.history.push(input.trim());
				// Keep only the most recent maxHistory entries
				if (this.history.length > this.maxHistory) {
					this.history = this.history.slice(-this.maxHistory);
				}
				this.saveHistory();
			}
		}
	}

	loadHistory() {
		try {
			if (fs.existsSync(this.historyFilePath)) {
				const historyData = fs.readFileSync(this.historyFilePath, 'utf8');
				const savedHistory = JSON.parse(historyData);
				if (Array.isArray(savedHistory)) {
					// Limit to maxHistory items
					this.history = savedHistory.slice(-this.maxHistory);
				}
			}
		} catch (error) {
			console.warn('⚠️ Could not load REPL history, starting fresh:', error.message);
			this.history = [];
		}
	}

	saveHistory() {
		try {
			// Ensure context directory exists
			const contextDir = path.dirname(this.historyFilePath);
			if (!fs.existsSync(contextDir)) {
				fs.mkdirSync(contextDir, { recursive: true });
			}
			
			fs.writeFileSync(this.historyFilePath, JSON.stringify(this.history, null, 2));
		} catch (error) {
			console.warn('⚠️ Could not save REPL history:', error.message);
		}
	}
}