#!/usr/bin/env node
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Launch the hosted application (Markov text generator) with the given arguments and project root
 * @param {string[]} args - Command line arguments
 * @param {string} projectRoot - The project root directory
 * @returns {Promise<void>}
 */
export async function launch(args, projectRoot) {
  // Default to REPL mode if no args or if args are application-specific
  if (args.length === 0) {
    // Default to REPL mode if no args
    const { REPL } = await import('./transports/stdio/REPL.js');
    const repl = new REPL();
    return repl.start();
  } else {
    // Check if we're being called directly with command line args
    const { CLI } = await import('./transports/stdio/CLI.js');
    const cli = new CLI();
    return cli.run(args);
  }
}

// Note: This file is not meant to be run directly. Use main.js in the project root.