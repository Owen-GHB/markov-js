#!/usr/bin/env node

// Root entry point: ./markov-cli.js
import { MarkovREPL } from './src/entrypoints/REPL.js';

// Initialize and start the REPL
try {
  const cli = new MarkovREPL();
  cli.start();
} catch (error) {
  console.error('❌ Failed to start Markov REPL:', error.message);
  process.exit(1);
}
