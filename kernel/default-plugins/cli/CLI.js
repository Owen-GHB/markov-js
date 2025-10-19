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
		const { 
			manifestReader, 
			Runner, 
			HelpHandler, 
			formatResult, 
			Parser,
			StateManager,
			Evaluator
		} = await import(exportsUrl);
		const manifest = manifestReader(this.commandRoot);
		this.parser = new Parser(manifest);
		this.processor = new Runner(
			this.commandRoot,
			this.projectRoot,
			manifest
		);
		this.processor.state = StateManager.loadState(this.contextFilePath, this.processor.getManifest());

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
				const cmd = manifest.commands[helpArgs.command];
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

		try {
			const command = this.parser.parse(input);
			let result = await this.processor.runCommand(command, this.processor.state);
			
			// Apply success output template in transport layer
			const commandSpec = this.processor.getManifest().commands[command.name];
			if (commandSpec?.successOutput) {
				const templateContext = {
				input: command.args,
				output: result,
				state: this.processor.state,
				original: command.args,
				originalCommand: command.name
				};
				result = Evaluator.evaluateTemplate(commandSpec.successOutput, templateContext);
			}
			
			StateManager.saveState(this.processor.state, this.contextFilePath, manifest);
			console.log(formatResult(result));
		} catch (err) {
			console.error(`❌ ${err}`);
			process.exit(1);
		}
	}
}