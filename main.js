#!/usr/bin/env node

import path from 'path';
import { fileURLToPath } from 'url';

// Determine the project root dynamically
const __filename = fileURLToPath(import.meta.url);  // main.js location
const __dirname = path.dirname(__filename);        // project root

// Check command line arguments
const args = process.argv.slice(2);

// Check if we should regenerate UI
const generateArg = args.find(arg => arg === '--generate' || arg === '-g');
if (generateArg) {
    // Import and run the UI generator with proper paths
    import('./kernel/generator/UI.js')
        .then(({ UI }) => {
            const generator = new UI();
            // Pass absolute paths based on the project root
            const contractDir = path.join(__dirname, 'contract');
            const outputDir = path.join(__dirname, 'generated-ui');
            return generator.generate(contractDir, outputDir, 'index.html');
        })
        .then(() => {
            console.log('✅ UI generation completed successfully!');
            process.exit(0);
        })
        .catch((err) => {
            console.error('❌ Failed to generate UI:', err.message);
            process.exit(1);
        });
}
// Check if we should start HTTP server
else if (args.find(arg => arg.startsWith('--http'))) {
    const httpArg = args.find(arg => arg.startsWith('--http'));
    
    // Extract port if specified (format: --http=8080)
    let port = 8080; // default port
    if (httpArg.includes('=')) {
        const portStr = httpArg.split('=')[1];
        port = parseInt(portStr, 10);
        if (isNaN(port) || port < 1 || port > 65535) {
            console.error('❌ Invalid port number. Please specify a port between 1 and 65535');
            process.exit(1);
        }
    }
    
    // Start HTTP server
    import('./kernel/transports/HTTP.js')
        .then(({ startServer }) => {
            startServer(port);
        })
        .catch((err) => {
            console.error('❌ Failed to start HTTP server:', err.message);
            process.exit(1);
        });
} else if (args.length > 0) {
    // Check if we're being called directly with command line args
    import('./kernel/transports/CLI.js')
        .then(({ CLI }) => {
            const cli = new CLI();
            cli.run(args);
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