#!/usr/bin/env node

import { CommandParser } from '../../CommandParser.js';
import { CommandHandler } from '../../CommandHandler.js';
import stateManager from '../../utils/StateManager.js';
import { manifest } from '../../contract.js';

export class CLI {
	constructor() {
		this.parser = new CommandParser();
		this.handler = new CommandHandler();
		// Use shared state manager
		this.state = stateManager.getStateMap();
	}

	/**
	 * Run the CLI with provided arguments
	 * @param {string[]} args - Command line arguments
	 */
	async run(args) {
		if (args.length === 0 || args[0].toLowerCase() === 'help') {
			return await this.showHelp();
		}

		const input = args.join(' ');

		// Create context with state for the parser
		const context = { state: this.state, manifest };
		const { error, command } = this.parser.parse(input, context);

		if (error) {
			console.error(`❌ ${error}`);
			await this.showHelp();
			process.exit(1);
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
	 * Display help message
	 */
	async showHelp() {
		// For CLI help, we'll get the help text directly from the help handler module
		try {
			const helpModule = await import('../../contract/help/handler.js');
			const helpText = helpModule.getHelpText ? helpModule.getHelpText() : 
						   (typeof helpModule.getHelpText === 'function' ? helpModule.getHelpText() : '');
			console.log(helpText);
		} catch (error) {
			// Fallback if we can't load the help text
			console.log('\n🔗 Command-Line Application\n=============================');
		}
		
		console.log('\nCommand Line Usage:');
		console.log('  app-cli <command> [args...]');
		console.log('  app-cli \'command(\"param\", key=value)\'');
	}
}

if (import.meta.url === `file://${process.argv[1]}`) {
	const cli = new CLI();
	cli.run(process.argv.slice(2));
}
