#!/usr/bin/env node

import { CommandParser } from '../../CommandParser.js';
import { CommandHandler } from '../../CommandHandler.js';
import stateManager from '../../utils/StateManager.js';
import { manifest } from '../../contract.js';
import { HelpCommand } from './commands/help.js';
import { ExitCommand } from './commands/exit.js';

export class CLI {
	constructor() {
		this.parser = new CommandParser();
		this.handler = new CommandHandler();
		// Use shared state manager
		this.state = stateManager.getStateMap();
		this.helpCommand = new HelpCommand();
		this.exitCommand = new ExitCommand();
	}

	/**
	 * Run the CLI with provided arguments
	 * @param {string[]} args - Command line arguments
	 */
	async run(args) {
		if (args.length === 0) {
			// Show help when no arguments provided
			const helpContext = { manifest };
			const result = await this.helpCommand.handle({ name: 'help', args: {} }, helpContext);
			if (result.output) {
				console.log(result.output);
			}
			process.exit(0);
		}
		
		// Handle simple commands without parens
		const firstArg = args[0];
		if (firstArg.toLowerCase() === 'help') {
			const helpArgs = args.slice(1);
			const helpContext = { manifest };
			const command = { 
				name: 'help', 
				args: helpArgs.length > 0 ? { command: helpArgs[0] } : {} 
			};
			const result = await this.helpCommand.handle(command, helpContext);
			if (result.output) {
				console.log(result.output);
			}
			process.exit(0);
		}
		
		if (firstArg.toLowerCase() === 'exit') {
			console.log('Goodbye!');
			process.exit(0);
		}
		
		// Join all arguments into a single command string for parsing
		const input = args.join(' ');
		
		// Special handling for help and exit commands with function syntax
		if (input.trim().toLowerCase() === 'help()' || input.trim().toLowerCase() === 'exit()') {
			if (input.trim().toLowerCase() === 'help()') {
				const helpContext = { manifest };
				const result = await this.helpCommand.handle({ name: 'help', args: {} }, helpContext);
				if (result.output) {
					console.log(result.output);
				}
				process.exit(0);
			} else {
				console.log('Goodbye!');
				process.exit(0);
			}
		}

		// Create context with state for the parser
		const context = { state: this.state, manifest };
		const { error, command } = this.parser.parse(input, context);

		if (error) {
			console.error(`❌ ${error}`);
			const helpContext = { manifest };
			const result = await this.helpCommand.handle({ name: 'help', args: {} }, helpContext);
			if (result.output) {
				console.log(result.output);
			}
			process.exit(1);
		}

		// Handle built-in commands
		if (command.name === 'help') {
			const helpContext = { manifest };
			const result = await this.helpCommand.handle(command, helpContext);
			if (result.output) {
				console.log(result.output);
			}
			process.exit(0);
		}
		
		if (command.name === 'exit') {
			const result = await this.exitCommand.handle(command, context);
			if (result.output) {
				console.log(result.output);
			}
			process.exit(0);
		}

		const result = await this.handler.handleCommand(command);

		if (result.error) {
			console.error(`❌ ${result.error}`);
			process.exit(1);
		}

		if (result.output) {
			console.log(result.output);
		}

		// Apply side effects and save state if command was successful
		const commandSpec = manifest.commands.find(c => c.name === command.name);
		if (commandSpec) {
			stateManager.applySideEffects(command, commandSpec);
			stateManager.saveState();
		}
	}

	/**
	 * Show help information
	 */
	async showHelp() {
		const helpContext = { manifest };
		const result = await this.helpCommand.handle({ name: 'help', args: {} }, helpContext);
		if (result.output) {
			console.log(result.output);
		}
	}
}

if (import.meta.url === `file://${process.argv[1]}`) {
	const cli = new CLI();
	cli.run(process.argv.slice(2));
}