#!/usr/bin/env node
import path from 'path';
import { fileURLToPath } from 'url';
import { buildConfig } from './utils/config-loader.js';
import pathResolver from './utils/path-resolver.js';
import { manifest } from './contract.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Launch the kernel infrastructure with the given arguments and project root
 * @param {string[]} args - Command line arguments
 * @param {string} projectRoot - The project root directory
 * @returns {Promise<void>}
 */
export async function launch(args, projectRoot) {
  // Check if we should run in Electron
  const electronArg = args.find(arg => arg === '--electron' || arg === '-e');
  if (electronArg) {
    // Launch Electron using npx, which will run electron-main.js
    // The electron-main.js handles UI generation and window creation
    return import('child_process')
      .then(({ spawn }) => {
        const npxProcess = spawn('npx', ['electron', path.join(projectRoot, 'electron-main.js')], {
          stdio: 'inherit',
          cwd: projectRoot,  // Crucial: run from project root
          shell: true
        });

        npxProcess.on('error', (err) => {
          console.error('❌ Failed to start Electron:', err.message);
          console.log('Make sure you have installed Electron as a dev dependency: npm install --save-dev electron');
          process.exit(1);
        });

        npxProcess.on('close', (code) => {
          console.log(`Electron process exited with code ${code}`);
          process.exit(code);
        });
      })
      .catch((err) => {
        console.error('❌ Failed to launch Electron:', err.message);
        process.exit(1);
      });
  }
  // Check if we should regenerate UI
  else if (args.find(arg => arg === '--generate' || arg === '-g')) {
    // Import and run the UI generator with proper paths
    const { UI } = await import('./generator/UI.js'); // Dynamic import for generator
    const generator = new UI();
    
    // Build unified configuration
    const config = buildConfig(projectRoot);
    
    const outputDir = config.paths.generatedUIDir;
    const templateDir = config.paths.templatesDir;
    return generator.generate(manifest, outputDir, templateDir, 'index.html')
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
    
    // Start HTTP server (API only) - instantiate directly instead of using HTTP.js
    const { HTTPServer } = await import('./transports/http/HTTP.js'); // Dynamic import for transport
    const { manifest } = await import('./contract.js');
    
    // Build unified configuration
    const config = buildConfig(projectRoot);
    
    const server = new HTTPServer({
      port: port,
      apiEndpoint: '/' // Serve API directly at root (original behavior)
    });
    
    return server.start(config, manifest);
  }
  // Check if we should start HTTP server serving both UI and API
  else if (args.find(arg => arg.startsWith('--serve'))) {
    const serveArg = args.find(arg => arg.startsWith('--serve'));
    
    // Extract port if specified (format: --serve=8080)
    let port = 8080; // default port
    if (serveArg.includes('=')) {
      const portStr = serveArg.split('=')[1];
      port = parseInt(portStr, 10);
      if (isNaN(port) || port < 1 || port > 65535) {
        console.error('❌ Invalid port number. Please specify a port between 1 and 65535');
        process.exit(1);
      }
    }
    
    // Start server that serves both UI and API - instantiate directly instead of using HTTP-serve.js
    const { HTTPServer } = await import('./transports/http/HTTP.js'); // Dynamic import for transport
    const { manifest } = await import('./contract.js');
    
    // Build unified configuration
    const config = buildConfig(projectRoot);
    
    const server = new HTTPServer({
      port: port,
      staticDir: config.paths.servedUIDir, // Use path from unified config
      apiEndpoint: '/api'
    });
    
    return server.start(config, manifest);
  } else {
    // For other kernel commands or to show help
    console.log('Kernel command-line interface');
    console.log('Available commands:');
    console.log('  --generate, -g     Generate UI from contracts');
    console.log('  --serve[=port]     Serve UI and API on specified port (default 8080)');
    console.log('  --http[=port]      Serve API only on specified port (default 8080)');
    console.log('  --electron, -e     Launch Electron application');
    process.exit(0);
  }
}

// Note: This file is not meant to be run directly. Use kernel.js in the project root.