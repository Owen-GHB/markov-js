#!/usr/bin/env node

import { CommandProcessor } from '../../CommandProcessor.js';

export class CLI {
	constructor() {
		this.processor = new CommandProcessor();
	}

	/**
	 * Run the CLI with provided arguments
	 * @param {string[]} args - Command line arguments
	 */
	async run(args) {
		if (args.length === 0) {
			// Show help when no arguments provided by processing the help command
			const result = await this.processor.processCommand('help()');

			if (result.error) {
				console.error(`❌ ${result.error}`);
				process.exit(1);
			}
			
			if (result.output) {
				console.log(result.output);
			}
			process.exit(0);
		}

		// Join all arguments into a single command string for parsing
		const input = args.join(' ');

		// Process the command using the shared processor
		const result = await this.processor.processCommand(input);

		if (result.error) {
			console.error(`❌ ${result.error}`);
			// Show help on error
			const helpResult = await this.processor.processCommand('help()');
			if (helpResult.output) {
				console.log(helpResult.output);
			}
			process.exit(1);
		}

		if (result.output) {
			console.log(result.output);
		}

		// Check if the command requested exit
		if (result.exit) {
			process.exit(0);
		}
	}

	/**
	 * Show help information
	 */
	async showHelp() {
		const result = await this.processor.processCommand('help()');
		if (result.output) {
			console.log(result.output);
		}
	}
}

if (import.meta.url === `file://${process.argv[1]}`) {
	const cli = new CLI();
	cli.run(process.argv.slice(2));
}