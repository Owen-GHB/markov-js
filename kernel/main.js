#!/usr/bin/env node
import { launch } from './launcher.js';
launch(process.argv.slice(2)).catch(console.error);
