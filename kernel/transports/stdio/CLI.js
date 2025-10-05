#!/usr/bin/env node

import { CommandProcessor } from '../../processor/CommandProcessor.js';

export class CLI {
	constructor(config, manifest) {
		if (!config || typeof config !== 'object') {
			throw new Error('CLI requires a config object');
		}
		
		// Validate manifest parameter
		if (!manifest || typeof manifest !== 'object') {
			throw new Error('CLI requires a manifest object');
		}
		
		// Extract paths from nested config object
		const paths = config.paths || {};
		
		if (!paths.contextFilePath) {
			throw new Error('CLI config requires paths with contextFilePath property');
		}
		this.processor = new CommandProcessor(paths, manifest, config);
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

// The CLI class now requires paths to be passed in, so direct execution from this file
// is not possible without the path resolver. This functionality would need to be handled
// by the main application which has access to the path resolver.