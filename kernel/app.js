#!/usr/bin/env node
import path from 'path';
import { fileURLToPath } from 'url';
import { manifest } from './contract.js';
import pathResolver from './utils/path-resolver.js';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load configuration from file with fallback to defaults
 * @param {string} configFilePath - Path to configuration file
 * @param {Object} defaultConfig - Default configuration values
 * @returns {Object} Loaded configuration merged with defaults
 */
function loadConfig(configFilePath, defaultConfig = {}) {
  let config = { ...defaultConfig };
  try {
    if (fs.existsSync(configFilePath)) {
      const configFile = fs.readFileSync(configFilePath, 'utf8');
      const loadedConfig = JSON.parse(configFile);
      config = { ...config, ...loadedConfig };
    }
  } catch (error) {
    console.warn('⚠️ Could not load config file, using defaults:', error.message);
  }
  return config;
}

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
    
    // Load configuration with fallback defaults
    const defaultConfig = { repl: { maxHistory: 100 } }; // fallback default
    const configFilePath = pathResolver.getConfigFilePath();
    const config = loadConfig(configFilePath, defaultConfig);
    
    // Prepare standardized config object with paths
    const fullConfig = {
      paths: {
        configFilePath: configFilePath,
        contextFilePath: pathResolver.getContextFilePath('repl-history.json'),
        replHistoryFilePath: pathResolver.getContextFilePath('repl-history.json'),
        contractDir: pathResolver.getContractDir()
      },
      repl: { maxHistory: 100 }, // fallback default
      ...config
    };
    
    const repl = new REPL();
    return repl.start(fullConfig, manifest);
  } else {
    // Check if we're being called directly with command line args
    const { CLI } = await import('./transports/stdio/CLI.js');
    
    // Prepare standardized config object with paths
    const config = {
      paths: {
        contextFilePath: pathResolver.getContextFilePath('state.json'),
        configFilePath: pathResolver.getConfigFilePath(),
        contractDir: pathResolver.getContractDir()
      }
    };
    const cli = new CLI(config, manifest);
    return cli.run(args);
  }
}

// Note: This file is not meant to be run directly. Use main.js in the project root.