#!/usr/bin/env node

// Check if we're being called directly with command line args
if (process.argv.length > 2) {
    import('./src/entrypoints/CLI.js').then(({ MarkovCLI }) => {
        const cli = new MarkovCLI();
        cli.run(process.argv.slice(2));
    }).catch(err => {
        console.error('❌ Failed to load CLI:', err.message);
        process.exit(1);
    });
} else {
    // Default to REPL mode if no args
    import('./src/entrypoints/REPL.js').then(({ MarkovREPL }) => {
        const repl = new MarkovREPL();
        repl.start();
    }).catch(err => {
        console.error('❌ Failed to start Markov REPL:', err.message);
        process.exit(1);
    });
}