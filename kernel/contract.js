// manifestLoader.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Loads and merges manifest from the new 4-file structure
 * @param {string} projectRoot - Root directory of the project
 * @returns {Object} - Complete merged manifest
 */
export function loadManifest(projectRoot) {
  // Load the four core files
  const contract = loadJSONFile(projectRoot, 'contract.json');
  const commands = loadJSONFile(projectRoot, 'commands.json');
  const runtime = loadJSONFile(projectRoot, 'runtime.json', {}); // Optional
  const help = loadJSONFile(projectRoot, 'help.json', {}); // Optional

  // Transform commands object into array with name property
  const commandArray = Object.entries(commands).map(([commandName, commandSpec]) => {
    return {
      name: commandName,
      ...commandSpec,
      // Merge runtime and help data for this command
      ...(runtime[commandName] || {}),
      ...(help[commandName] || {}),
      // Deep merge parameters from all sources
      parameters: mergeParameters(
        commandSpec.parameters,
        runtime[commandName]?.parameters,
        help[commandName]?.parameters
      )
    };
  });

  return {
    ...contract,
    commands: commandArray
  };
}

/**
 * Load a JSON file with optional default value
 */
function loadJSONFile(projectRoot, filename, defaultValue = null) {
  const filePath = path.join(projectRoot, filename);
  
  if (!fs.existsSync(filePath)) {
    if (defaultValue !== null) {
      return defaultValue;
    }
    throw new Error(`Required manifest file not found: ${filename}`);
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`Failed to parse ${filename}: ${error.message}`);
  }
}

/**
 * Deep merge parameters from multiple sources
 */
function mergeParameters(...paramSources) {
  const merged = {};
  
  for (const params of paramSources) {
    if (!params || typeof params !== 'object') continue;
    
    for (const [paramName, paramSpec] of Object.entries(params)) {
      if (merged[paramName]) {
        // Merge existing parameter spec
        merged[paramName] = { ...merged[paramName], ...paramSpec };
      } else {
        // Create new parameter spec
        merged[paramName] = { ...paramSpec };
      }
    }
  }
  
  return merged;
}

/**
 * Utility to validate the manifest structure
 */
export function validateManifest(manifest) {
  const errors = [];

  if (!manifest.sources || typeof manifest.sources !== 'object') {
    errors.push('Manifest must contain a sources object');
  }

  if (!Array.isArray(manifest.commands)) {
    errors.push('Manifest must contain a commands array');
  } else {
    manifest.commands.forEach((command, index) => {
      if (!command.name) {
        errors.push(`Command at index ${index} missing name property`);
      }
      if (!command.commandType) {
        errors.push(`Command '${command.name}' missing commandType`);
      }
      if (command.commandType === 'native-method' && !command.source) {
        errors.push(`Native-method command '${command.name}' missing source property`);
      }
    });
  }

  if (errors.length > 0) {
    throw new Error(`Manifest validation failed:\n- ${errors.join('\n- ')}`);
  }

  return true;
}

// Updated version that works with the new loader
export function manifestReader(projectRoot) {
  return loadManifest(projectRoot);
}