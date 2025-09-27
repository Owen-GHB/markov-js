import readline from 'readline';
import { CommandHandler } from '../CommandHandler.js';
import { CommandParser } from '../CommandParser.js';
import { manifest } from '../contract.js';

export class REPL {
	constructor() {
		this.handler = new CommandHandler();
		this.commandParser = new CommandParser();
		this.state = new Map(Object.entries(manifest.stateDefaults)); // ← NEW
	}

	async start() {
		// Load help text first, then initialize REPL and event handlers
		try {
			// For REPL help, we'll get the help text directly from the help handler module
		} catch (error) {
			console.error('Error loading help text:', error);
		}

		// Initialize REPL instance after help text is displayed
		this.rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
			prompt: manifest.prompt || '> ', // Use prompt from manifest or default fallback
			completer: (line) => this.commandCompleter(line),
		});

		this.setupEventHandlers();
		// Start the prompt after everything is set up
		this.rl.prompt();
	}
	
	/* ---------- event handlers ---------- */

	/* ---------- event handlers ---------- */
	setupEventHandlers() {
		this.rl.on('line', async (input) => {
			input = input.trim();
			const context = { state: this.state, manifest }; // Build context object
			const parsed = this.commandParser.parse(input, context);
			if (parsed.error) {
				console.error(`❌ ${parsed.error}`);
				this.rl.prompt();
				return;
			}

			const command = parsed.command; // No need to fill defaults since parser handles it
			const result = await this.handler.handleCommand(command);

			if (result.error) console.error(`❌ ${result.error}`);
			if (result.output) console.log(result.output);

			this.applySideEffects(command); // ← NEW
			this.rl.prompt();
		});

		this.rl.on('close', () => {
			console.log('\nGoodbye!');
			process.exit(0);
		});

		process.on('SIGINT', () => {
			console.log('\nUse "exit" or Ctrl+D to quit.');
			this.rl.prompt();
		});
	}

	
	applySideEffects(cmd) {
		const spec = manifest.commands.find((c) => c.name === cmd.name);
		if (!spec?.sideEffects) return;

		if (spec.sideEffects?.builtin === 'exit') {
			this.rl.close();
			return;
		}

		/* ---------- helper to resolve template strings ---------- */
		const evaluateTemplate = (tpl, bag) =>
			tpl.replace(/\{\{(\w+)(?:\s*\|\s*(\w+))?\}\}/g, (_, key, filter) => {
				let val = bag[key];
				if (filter === 'basename') val = val?.replace(/\.[^/.]+$/, '');
				return val ?? '';
			});

		/* ---------- apply side-effects ---------- */
		if (spec.sideEffects.setState) {
			for (const [key, rule] of Object.entries(spec.sideEffects.setState)) {
				let value;
				if (rule.fromParam) value = cmd.args[rule.fromParam];
				if (value === undefined && rule.template) {
					value = evaluateTemplate(rule.template, cmd.args);
				}
				if (value !== undefined) this.state.set(key, value);
			}
		}

		if (spec.sideEffects.clearState) {
			for (const key of spec.sideEffects.clearState) this.state.delete(key);
		}
	}

	/* ---------- unchanged helpers ---------- */
	commandCompleter(line) {
		const commands = manifest.commands.map((c) => c.name);
		const hits = commands.filter((c) => c.startsWith(line));
		return [hits.length ? hits : commands, line];
	}
}