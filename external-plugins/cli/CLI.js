import { formatResult } from '../shared/format.js';

export class CLI {
	constructor(config, commandProcessor) {
		if (!config || typeof config !== 'object') {
			throw new Error('CLI requires a config object');
		}

		// Extract paths from nested config object
		const paths = config.paths || {};

		if (!paths.contextFilePath) {
			throw new Error(
				'CLI config requires paths with contextFilePath property',
			);
		}

		if (
			!commandProcessor ||
			typeof commandProcessor.processCommand !== 'function'
		) {
			throw new Error(
				'start method requires a valid commandProcessor with processCommand method',
			);
		}
		this.processor = commandProcessor;
		this.contextFilePath = paths.contextFilePath;
	}

	/**
	 * Run the CLI with provided arguments
	 * @param {string[]} args - Command line arguments
	 */
	async run(args) {
		if (args.length === 0) {
			// Show help when no arguments provided by processing the help command
			const result = await this.processor.processCommand(
				'help()',
				this.contextFilePath,
			);

			if (result.error) {
				console.error(`❌ ${result.error}`);
				process.exit(1);
			}

			if (result.output) {
				console.log(formatResult(result.output));
			}
			process.exit(0);
		}

		// Join all arguments into a single command string for parsing
		const input = args.join(' ');

		// Process the command using the shared processor
		const result = await this.processor.processCommand(
			input,
			this.contextFilePath,
		);

		if (result.error) {
			console.error(`❌ ${result.error}`);
			// Show help on error
			const helpResult = await this.processor.processCommand(
				'help()',
				this.contextFilePath,
			);
			if (helpResult.output) {
				console.log(formatResult(helpResult.output));
			}
			process.exit(1);
		}

		if (result.output) {
			console.log(formatResult(result.output));
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
		const result = await this.processor.processCommand(
			'help()',
			this.contextFilePath,
		);
		if (result.output) {
			console.log(formatResult(result.output));
		}
	}
}

// The CLI class now requires paths to be passed in, so direct execution from this file
// is not possible without the path resolver. This functionality would need to be handled
// by the main application which has access to the path resolver.
