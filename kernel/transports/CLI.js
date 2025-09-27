#!/usr/bin/env node

import { CommandParser } from '../CommandParser.js';
import { CommandHandler } from '../CommandHandler.js';

export class CLI {
	constructor() {
		this.parser = new CommandParser();
		this.handler = new CommandHandler();
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

		const { error, command } = this.parser.parse(input);

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
	}

	/**
	 * Display help message
	 */
	async showHelp() {
		// For CLI help, we'll get the help text directly from the help handler module
		try {
			const helpModule = await import('../contract/help/handler.js');
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
