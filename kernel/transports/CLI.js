#!/usr/bin/env node

import { CommandParser } from '../CommandParser.js';
import { CommandHandler } from '../CommandHandler.js';

export class MarkovCLI {
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
			return this.showHelp();
		}

		const input = args.join(' ');

		const { error, command } = this.parser.parse(input);

		if (error) {
			console.error(`❌ ${error}`);
			this.showHelp();
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
	showHelp() {
		console.log(this.handler.getHelpText());
		console.log('\nCommand Line Usage:');
		console.log('  markov-cli <command> [args...]');
		console.log('  markov-cli \'command("param", key=value)\'');
		console.log('\nExamples:');
		console.log('  markov-cli generate sample.json length=50 temperature=0.8');
		console.log(
			'  markov-cli \'generate("sample.json", length=50, temperature=0.8)\'',
		);
		console.log('  markov-cli listModels');
	}
}

if (import.meta.url === `file://${process.argv[1]}`) {
	const cli = new MarkovCLI();
	cli.run(process.argv.slice(2));
}
