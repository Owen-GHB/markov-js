#!/usr/bin/env node
import { launch } from './launcher.js';

// Always use current working directory as project root  
const projectRoot = process.cwd();
launch(process.argv.slice(2), projectRoot).catch(console.error);