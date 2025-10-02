#!/usr/bin/env node
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Launch the application with the given arguments and project root
 * @param {string[]} args - Command line arguments
 * @param {string} projectRoot - The project root directory
 * @returns {Promise<void>}
 */
export async function launch(args, projectRoot) {
  // Check if we should run in Electron
  const electronArg = args.find(arg => arg === '--electron' || arg === '-e');
  if (electronArg) {
    const { launchElectron } = await import('./electron/launcher.js');
    return launchElectron(projectRoot);
  }
  // Check if we should regenerate UI
  else if (args.find(arg => arg === '--generate' || arg === '-g')) {
    // Import and run the UI generator with proper paths
    const { UI } = await import('./generator/UI.js');
    const generator = new UI();
    // Pass absolute paths based on the project root
    const contractDir = path.join(projectRoot, 'contract');
    const outputDir = path.join(projectRoot, 'generated-ui');
    return generator.generate(contractDir, outputDir, 'index.html')
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
    const { startServer } = await import('./transports/HTTP.js');
    return startServer(port);
  } else if (args.length > 0) {
    // Check if we're being called directly with command line args
    const { CLI } = await import('./transports/CLI.js');
    const cli = new CLI();
    return cli.run(args);
  } else {
    // Default to REPL mode if no args
    const { REPL } = await import('./transports/REPL.js');
    const repl = new REPL();
    return repl.start();
  }
}

// If this file is run directly (not imported), launch with current directory as project root
if (import.meta.url === `file://${__filename}`) {
  const projectRoot = process.cwd();
  launch(process.argv.slice(2), projectRoot);
}