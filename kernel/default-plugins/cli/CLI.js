// File: default-plugins/cli/CLI.js

import path from 'path';
import { pathToFileURL } from 'url';

export class CLI {
	constructor(kernelPath, commandRoot, projectRoot, contextFilePath) {
		if (!contextFilePath) {
			throw new Error('CLI requires a contextFilePath property');
		}

		if (!kernelPath) {
			throw new Error('CLI requires a kernelPath property');
		}
		this.processor = null;
		this.contextFilePath = contextFilePath;
		this.kernelPath = kernelPath;
		this.commandRoot = commandRoot;
		this.projectRoot = projectRoot;	
	}

	/**
	 * Run the CLI with provided arguments
	 * @param {string[]} args - Command line arguments
	 */
	async run(args) {
		const exportsUrl = pathToFileURL(path.join(this.kernelPath, 'exports.js')).href;
		const { manifestReader, CommandProcessor, HelpHandler, formatResult } = await import(exportsUrl);
		const manifest = manifestReader(this.commandRoot);
		const commandProcessor = new CommandProcessor(
			this.commandRoot,
			this.projectRoot,
			manifest
		);
		this.processor = commandProcessor;
		if (this.contextFilePath) this.processor.stateManager.loadState(this.contextFilePath);

		if (args.length === 0) {
			// Show help when no arguments provided using HelpHandler
			console.log(HelpHandler.formatGeneralHelp(manifest));
			process.exit(0);
		}

		// Join all arguments into a single command string for parsing
		const input = args.join(' ');

		// Handle help command using HelpHandler
		if (HelpHandler.isHelpCommand(input)) {
			const helpArgs = HelpHandler.getHelpCommandArgs(input);
			if (helpArgs.command) {
				const cmd = manifest.commands.find(c => c.name === helpArgs.command);
				if (!cmd) {
					console.error(`❌ Unknown command: ${helpArgs.command}`);
					console.log(HelpHandler.formatGeneralHelp(manifest));
					process.exit(1);
				}
				console.log(HelpHandler.formatCommandHelp(cmd));
			} else {
				console.log(HelpHandler.formatGeneralHelp(manifest));
			}
			process.exit(0);
		}

		// Handle exit command
		if (HelpHandler.isExitCommand(input)) {
			console.log('Goodbye!');
			process.exit(0);
		}

		// Process the command using the shared processor
		const result = await this.processor.processCommand(
			input,
			this.contextFilePath,
		);

		if (result.error) {
			console.error(`❌ ${result.error}`);
			// Show help on error using HelpHandler
			console.log(HelpHandler.formatGeneralHelp(manifest));
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
}

// This file is not meant to be run directly; it is imported and used by the main kernel app.
