#!/usr/bin/env node
import { launch } from './kernel/main.js';

// Determine project root and launch with command line args
const projectRoot = process.cwd();
launch(process.argv.slice(2), projectRoot);