#!/usr/bin/env node
import { launch } from './kernel/kernel.js';

// Determine project root and launch with command line args
const projectRoot = process.cwd();
launch(process.argv.slice(2), projectRoot).catch((err) => {
	console.error('❌ Error in kernel:', err.message);
	process.exit(1);
});
