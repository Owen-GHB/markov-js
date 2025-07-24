#!/usr/bin/env node

// Root entry point: ./markov-cli.js
import { MarkovCLI } from './src/cli/CLI.js';

// Initialize and start the CLI
try {
  const cli = new MarkovCLI();
  cli.start();
} catch (error) {
  console.error('❌ Failed to start Markov CLI:', error.message);
  process.exit(1);
}
