import { formatResult } from '../shared/format.js';
import path from 'path';
import { pathToFileURL } from 'url';

export class CLI {
	constructor(kernelPath, projectRoot, contextFilePath) {
		if (!contextFilePath) {
			throw new Error('CLI requires a contextFilePath property');
		}

		if (!kernelPath) {
			throw new Error('CLI requires a kernelPath property');
		}
		this.processor = null;
		this.contextFilePath = contextFilePath;
		this.kernelPath = kernelPath;
		this.projectRoot = projectRoot;	
	}

	/**
	 * Run the CLI with provided arguments
	 * @param {string[]} args - Command line arguments
	 */
	async run(args) {
		const manifestUrl = pathToFileURL(path.join(this.kernelPath, 'contract.js')).href;
		const { manifestReader } = await import(manifestUrl);
		const manifest = manifestReader(this.projectRoot);
		const commandProcessorUrl = pathToFileURL(path.join(this.kernelPath, 'processor/CommandProcessor.js')).href;
		const { CommandProcessor } = await import(commandProcessorUrl);
		const commandProcessor = new CommandProcessor(
			this.projectRoot,
			manifest
		);
		this.processor = commandProcessor;
		if (this.contextFilePath) this.processor.stateManager.loadState(this.contextFilePath);

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
