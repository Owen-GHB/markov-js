import readline from 'readline';
import fs from 'fs';
import path from 'path';
import pathResolver from '../../utils/path-resolver.js';
import { CommandProcessor } from '../../CommandProcessor.js';

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
		this.processor = new CommandProcessor();
		this.maxHistory = config.repl.maxHistory || 100;
		this.history = [];
		this.historyFilePath = pathResolver.getContextFilePath('repl-history.json');
		this.loadHistory();
	}

	async start() {
		// Initialize REPL instance
		this.rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
			prompt: this.processor.getManifest().prompt || '> ', // Use prompt from manifest or default fallback
			completer: (line) => this.commandCompleter(line),
		});

		// Load saved history into readline's history array for up/down navigation
		this.rl.history = [...this.history].reverse(); // Reverse to match readline's order (newest first)

		// Display welcome message and prompt
		console.log(`🔗 ${this.processor.getManifest().name} - ${this.processor.getManifest().description}`);
		console.log('='.repeat(Math.max(this.processor.getManifest().name.length + 2, 40)));
		console.log('Type \"help()\" for available commands or \"exit()\" to quit.');
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

			// Process command using the shared processor
			const result = await this.processor.processCommand(input);

			if (result.error) console.error(`❌ ${result.error}`);
			if (result.output) console.log(result.output);

			// Check if the command requested exit
			if (result.exit) {
				this.rl.close();
				return;
			}

			this.rl.prompt();
		});

		this.rl.on('close', () => {
			console.log('\nGoodbye!');
			process.exit(0);
		});

		process.on('SIGINT', () => {
			console.log('\nUse \"exit\" or Ctrl+D to quit.');
			this.rl.prompt();
		});
	}

	/* ---------- unchanged helpers ---------- */
	commandCompleter(line) {
		// Include built-in commands in completion
		const commands = [...this.processor.getManifest().commands.map((c) => c.name), 'help', 'exit'];
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