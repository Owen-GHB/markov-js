import { Vertex } from 'vertex-kernel';

export class CLI {
	constructor(commandRoot, contextFilePath) {
		this.contextFilePath = contextFilePath;
		this.commandRoot = commandRoot;

		this.vertex = null;
	}

	async run(args) {
		this.vertex = new Vertex({
			commandRoot: this.commandRoot,
			contextFilePath: this.contextFilePath,
			template: 'successOutput',
		});

		// Handle empty args or help commands
		if (args.length === 0 || this.isHelpRequest(args)) {
			console.log(this.vertex.getHelpText());
			process.exit(0);
		}

		// Handle exit command
		if (this.isExitCommand(args)) {
			console.log('Goodbye!');
			process.exit(0);
		}

		// Execute command
		const input = args.join(' ');
		try {
			const result = await this.vertex.executeCommand(input);
			console.log(result);
		} catch (err) {
			console.error(`❌ ${err}`);
			process.exit(1);
		}
	}

	// Simple help detection - no fancy parsing needed
	isHelpRequest(args) {
		const firstArg = args[0]?.toLowerCase();
		return firstArg === 'help' || firstArg === '--help' || firstArg === '-h';
	}

	// Simple exit detection
	isExitCommand(args) {
		const firstArg = args[0]?.toLowerCase();
		return firstArg === 'exit' || firstArg === 'quit';
	}
}
