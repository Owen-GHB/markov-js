import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pathResolver from './path-resolver.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Load configuration from file with fallback to defaults
 * @param {string} configFilePath - Path to configuration file
 * @param {Object} defaultConfig - Default configuration values
 * @returns {Object} Loaded configuration merged with defaults
 */
function loadConfigFromFile(configFilePath, defaultConfig = {}) {
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
 * Build a complete configuration object with both file config and kernel-calculated paths
 * @param {string} projectRoot - The project root directory
 * @returns {Object} Complete configuration with resolved paths
 */
export function buildConfig(projectRoot) {
  const configFilePath = path.join(projectRoot, 'config', 'default.json');
  
  // Load user configuration from file
  const userConfig = loadConfigFromFile(configFilePath, {
    defaultHttpPort: 8080,
    repl: { maxHistory: 100 }
  });

  // Build complete paths using path resolver and user config
  const resolvedPaths = {
    // Core paths that must be calculated by kernel
    configFilePath: configFilePath,
    contextFilePath: pathResolver.getContextFilePath('state.json'),
    replHistoryFilePath: pathResolver.getContextFilePath('repl-history.json'), 
    contractDir: pathResolver.getContractDir(),
    servedUIDir: pathResolver.getServedUIDir(),
    electronPreloadPath: pathResolver.getElectronPreloadPath(),
    
    // Use user config paths with kernel fallbacks
    kernelDir: pathResolver.getKernelDir(),
    generatedUIDir: pathResolver.getGeneratedUIDir(),
    contextDir: pathResolver.getContextDir(),
    templatesDir: pathResolver.getTemplatesDir(),
    uiFilePath: pathResolver.getUIFilePath(),
  };

  // Build and return complete config object
  return {
    ...userConfig,
    paths: {
      ...userConfig.paths,
      ...resolvedPaths
    }
  };
}