import readline from 'readline';
import { CommandHandler } from '../interpreter/CommandHandler.js';
import { CommandParser } from '../interpreter/CommandParser.js';
import manifest from '../manifest.json' with { type: 'json' };

export class MarkovREPL {
	constructor() {
		this.handler = new CommandHandler();
		this.commandParser = new CommandParser();
		this.state = new Map(Object.entries(manifest.stateDefaults)); // ← NEW

		this.rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
			prompt: 'markov> ',
			completer: (line) => this.commandCompleter(line),
		});

		this.setupEventHandlers();
		console.log(this.handler.getHelpText()); // keep existing help
	}

	/* ---------- event handlers ---------- */
	setupEventHandlers() {
		this.rl.on('line', async (input) => {
			input = input.trim();
			const parsed = this.commandParser.parse(input);
			if (parsed.error) {
				console.error(`❌ ${parsed.error}`);
				this.rl.prompt();
				return;
			}

			const command = this.fillDefaults(parsed.command);
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

	/* ---------- new helpers ---------- */
	fillDefaults(cmd) {
		const spec = manifest.commands.find((c) => c.name === cmd.name);
		if (!spec) return cmd;

		const filled = { ...cmd };
		filled.args = { ...(cmd.args || {}) };

		for (const p of spec.parameters || []) {
			if (filled.args[p.name] === undefined) {
				if (p.runtimeFallback && this.state.has(p.runtimeFallback)) {
					filled.args[p.name] = this.state.get(p.runtimeFallback);
				} else if (p.default !== undefined) {
					filled.args[p.name] = p.default;
				}
			}
		}
		return filled;
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

	start() {
		this.rl.prompt();
	}
}
