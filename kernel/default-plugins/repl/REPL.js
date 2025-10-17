// File: default-plugins/repl/REPL.js

import readline from 'readline';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

export class REPL {
	constructor() {
		// These will be initialized in the start method
		this.processor = null;
		this.maxHistory = 100;
		this.history = [];
		this.historyFilePath = null;
	}

	async initialize(kernelPath, commandRoot, projectRoot, contextFilePath, historyFilePath, maxHistory) {
		this.kernelPath = kernelPath;
		this.commandRoot = commandRoot;
		this.projectRoot = projectRoot;
		this.contextFilePath = contextFilePath;
		
		this.maxHistory = maxHistory;
		this.historyFilePath = historyFilePath;
		const exportsUrl = pathToFileURL(path.join(kernelPath, 'exports.js')).href;
		const { manifestReader, CommandProcessor, CommandParser } = await import(exportsUrl);
		const manifest = manifestReader(this.commandRoot);
		this.processor = new CommandProcessor(
			this.commandRoot,
			this.projectRoot,
			manifest
		);
		this.state = CommandProcessor.StateManager.loadState(this.contextFilePath, manifest);
		this.parser = new CommandParser(manifest);
		if (contextFilePath) this.processor.stateManager.loadState(contextFilePath);
		this.loadHistory();
	}

	async start(kernelPath, commandRoot, projectRoot, contextFilePath, historyFilePath, maxHistory) {
		// Validate parameters
		if (contextFilePath && typeof contextFilePath !== 'string') {
			throw new Error('contextFilePath parameter must be a string if provided');
		}
		if (historyFilePath && typeof historyFilePath !== 'string') {
			throw new Error('historyFilePath parameter must be a string if provided');
		}
		if (maxHistory && (typeof maxHistory !== 'number' || maxHistory <= 0)) {
			throw new Error('maxHistory parameter must be a positive number if provided');
		}
		if (!kernelPath || typeof kernelPath !== 'string') {
			throw new Error('REPL requires a kernelPath parameter');
		}
		if (!projectRoot || typeof projectRoot !== 'string') {
			throw new Error('REPL requires a projectRoot parameter');
		}

		// Initialize with provided path and config values at the beginning of start
		await this.initialize(kernelPath, commandRoot, projectRoot, contextFilePath, historyFilePath, maxHistory);
		const { HelpHandler, formatResult } = await import(pathToFileURL(path.join(kernelPath, 'exports.js')).href);

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
		console.log(
			`🔗 ${this.processor.getManifest().name} - ${this.processor.getManifest().description}`,
		);
		console.log(
			'='.repeat(Math.max(this.processor.getManifest().name.length + 2, 40)),
		);
		console.log(
			'Type "help()" for available commands or "exit()" to quit.',
		);
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

			// Handle help command using HelpHandler
			if (HelpHandler.isHelpCommand(input)) {
				const helpArgs = HelpHandler.getHelpCommandArgs(input);
				if (helpArgs.command) {
					const cmd = this.processor.getManifest().commands[helpArgs.command];
					if (!cmd) {
						console.error(`❌ Unknown command: ${helpArgs.command}`);
					} else {
						console.log(HelpHandler.formatCommandHelp(cmd));
					}
				} else {
					console.log(HelpHandler.formatGeneralHelp(this.processor.getManifest()));
				}
				this.rl.prompt();
				return;
			}

			// Handle exit command
			if (HelpHandler.isExitCommand(input)) {
				console.log('Goodbye!');
				this.rl.close();
				return;
			}

			// Process command using the shared processor
			const parsedCommand = this.parser.parse(input);
			let result;
			if (parsedCommand.error) {
				result = parsedCommand;
			} else {
				const command = parsedCommand.command;
				result = await this.processor.runCommand(command, this.state);
				this.state = this.processor.state;
			}

			if (result.error) {
				console.error(`❌ ${result.error}`);
			}

			if (result.output) {
				this.processor.stateManager.saveState(this.state, this.contextFilePath, manifest);
				console.log(formatResult(result.output));
			}

			// Check if the command requested exit
			if (result.exit) {
				this.rl.close();
				return;
			}

			this.rl.prompt();
		});

		this.rl.on('close', () => {
			process.exit(0);
		});

		process.on('SIGINT', () => {
			console.log('\nUse "exit" or Ctrl+D to quit.');
			this.rl.prompt();
		});
	}

	commandCompleter(line) {
		// Include built-in commands in completion
		const commands = [
			...Object.keys(this.processor.getManifest().commands),
			'help',
			'exit',
		];
		const hits = commands.filter((c) => c.startsWith(line));
		return [hits.length ? hits : commands, line];
	}

	addToHistory(input) {
		if (input.trim()) {
			// Add to history if it's not a duplicate of the last entry
			if (
				this.history.length === 0 ||
				this.history[this.history.length - 1] !== input.trim()
			) {
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
			console.warn(
				'⚠️ Could not load REPL history, starting fresh:',
				error.message,
			);
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

			fs.writeFileSync(
				this.historyFilePath,
				JSON.stringify(this.history, null, 2),
			);
		} catch (error) {
			console.warn('⚠️ Could not save REPL history:', error.message);
		}
	}
}