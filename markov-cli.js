#!/usr/bin/env node

	// Check if we're being called directly with command line args
	if (process.argv.length > 2) {
		import('./kernel/transports/CLI.js')
			.then(({ CLI }) => {
				const cli = new CLI();
				cli.run(process.argv.slice(2));
			})
			.catch((err) => {
				console.error('❌ Failed to load CLI:', err.message);
				process.exit(1);
			});
	} else {
		// Default to REPL mode if no args
		import('./kernel/transports/REPL.js')
			.then(async ({ REPL }) => {
				const repl = new REPL();
				await repl.start();
			})
			.catch((err) => {
				console.error('❌ Failed to start REPL:', err.message);
				process.exit(1);
			});
	}
