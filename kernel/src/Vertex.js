import { Processor } from './Processor.js';
import { Evaluator } from './Evaluator.js';
import { Runner } from './Runner.js';
import { StateManager } from './StateManager.js';
import { manifestReader } from './manifestReader.js';
import { HelpHandler } from './utils/help.js';
import { Specifier } from './Specifier.js';

export class Vertex {
	constructor(options = {}) {
		this.commandRoot = options.commandRoot || process.cwd();
		this.contextFilePath = options.contextFilePath || null;
		this.defaultTemplate = options.template || null;

		this.manifest = manifestReader(this.commandRoot);
		this.runner = new Runner(this.commandRoot);

		this.state = this.contextFilePath
			? StateManager.loadState(this.contextFilePath, this.manifest)
			: StateManager.createState(this.manifest);
	}

	async executeCommand(input) {
		const processedInput = Processor.processInput(input, this.manifest);
        const commandSpec = Specifier.specifyCommand(processedInput, this.manifest);
		const processedArgs = StateManager.applyRuntimeFallbacks(
			processedInput.args,
			commandSpec.parameters,
			this.state,
		);
		const command = {
			name: processedInput.name,
			args: processedArgs,
		};

		// Execute command chain
		let result = await this.runner.runCommand(command, commandSpec, this.state);

		// Build template context for side effects
		const templateContext = {
			input: command.args,
			output: result,
			state: this.state,
		};

		// Apply side effects
		this.state = StateManager.applySideEffects(
			command,
			commandSpec,
			this.state,
			templateContext,
		);

		// Apply any templates if enabled
		if (this.defaultTemplate && commandSpec?.[this.defaultTemplate]) {
			const templateContext = {
				input: command.args,
				output: result,
				state: this.state,
				original: command.args,
				originalCommand: command.name,
			};
			result = Evaluator.evaluateTemplate(
				commandSpec[this.defaultTemplate],
				templateContext,
			);
		}

		// Save state if we have a context file
		if (this.contextFilePath) {
			StateManager.saveState(this.state, this.contextFilePath, this.manifest);
		}
		return result;
	}

	getHelpText() {
		return HelpHandler.formatGeneralHelp(this.manifest);
	}
}
