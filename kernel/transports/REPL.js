import readline from 'readline';
import fs from 'fs';
import path from 'path';
import pathResolver from '../utils/path-resolver.js';
import stateManager from '../utils/StateManager.js';
import { CommandHandler } from '../CommandHandler.js';
import { CommandParser } from '../CommandParser.js';
import { manifest } from '../contract.js';

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
	}

	async start() {
		// Load help text first, then initialize REPL and event handlers
		try {
			// For REPL help, we'll get the help text directly from the help handler module
		} catch (error) {
			console.error('Error loading help text:', error);
		}

		// Initialize REPL instance after help text is displayed
		this.rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
			prompt: manifest.prompt || '> ', // Use prompt from manifest or default fallback
			completer: (line) => this.commandCompleter(line),
		});

		// Load saved history into readline's history array for up/down navigation
		this.rl.history = [...this.history].reverse(); // Reverse to match readline's order (newest first)

		this.setupEventHandlers();
		// Start the prompt after everything is set up
		this.rl.prompt();
	}
	
	/* ---------- event handlers ---------- */

	/* ---------- history management ---------- */
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

	/* ---------- event handlers ---------- */
	setupEventHandlers() {
		this.rl.on('line', async (input) => {
			input = input.trim();
			// Add command to readline's history for up/down navigation
			if (input) {
				this.rl.history.unshift(input);
				// Limit history to maxHistory size
				if (this.rl.history.length > this.maxHistory) {
					this.rl.history = this.rl.history.slice(0, this.maxHistory);
				}
			}
			
			// Add command to persistent history file
			this.addToHistory(input);
			
			const context = { state: this.state, manifest }; // Build context object
			const parsed = this.commandParser.parse(input, context);
			if (parsed.error) {
				console.error(`❌ ${parsed.error}`);
				this.rl.prompt();
				return;
			}

			const command = parsed.command; // No need to fill defaults since parser handles it
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
		const spec = manifest.commands.find((c) => c.name === cmd.name);
		if (!spec?.sideEffects) return;

		if (spec.sideEffects?.builtin === 'exit') {
			this.rl.close();
			return;
		}

		// Use the shared state manager to apply side effects
		stateManager.applySideEffects(cmd, spec);
	}

	/* ---------- unchanged helpers ---------- */
	commandCompleter(line) {
		const commands = manifest.commands.map((c) => c.name);
		const hits = commands.filter((c) => c.startsWith(line));
		return [hits.length ? hits : commands, line];
	}
}