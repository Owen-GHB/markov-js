// File: loaders/manifestLoader.js

import fs from 'fs';
import path from 'path';

/**
 * Loads and merges manifest using per-file recursive merging
 */
export function loadManifest(projectRoot) {
  try {
    // 1. Recursive merge per file type (parent wins)
    const contracts = mergeFilesRecursive(projectRoot, 'contract.json');
    const commands = mergeFilesRecursive(projectRoot, 'commands.json', {});
    const help = mergeFilesRecursive(projectRoot, 'help.json', {});
    const runtime = mergeFilesRecursive(projectRoot, 'runtime.json', {});
    const routes = mergeFilesRecursive(projectRoot, 'routes.json', {});
    
    // 2. Combine everything into final manifest
    return combineManifest(contracts, commands, help, runtime, routes);
  } catch (error) {
    throw new Error(`Failed to load manifest: ${error.message}`);
  }
}

function mergeFilesRecursive(projectRoot, filename, defaultValue = null, parentRoot = null) {
  const current = loadJSONFile(projectRoot, filename, defaultValue) || {};
  let merged = { ...current };
  
  // Transform paths if this is commands.json and we're in a child
  if (filename === 'commands.json' && parentRoot) {
    merged = transformCommandSources(merged, projectRoot, parentRoot);
  }
  
  const contract = loadJSONFile(projectRoot, 'contract.json');
  
  if (contract && contract.sources) {
    for (const sourcePath of Object.values(contract.sources)) {
      try {
        const resolvedPath = validateSourcePath(sourcePath, projectRoot);
        if (fs.existsSync(resolvedPath)) {
          const childData = mergeFilesRecursive(resolvedPath, filename, defaultValue, projectRoot); // Pass current as parent
          merged = deepMerge(childData, merged);
        }
      } catch (error) {
        console.warn(`⚠️ Failed to merge ${filename} from source '${sourcePath}': ${error.message}`);
      }
    }
  }
  
  return merged;
}

function transformCommandSources(commands, childRoot, parentRoot) {
  const transformed = {};
  
  for (const [commandName, commandSpec] of Object.entries(commands)) {
    transformed[commandName] = {
      ...commandSpec,
      source: resolveSourcePath(commandSpec.source, childRoot, parentRoot)
    };
  }
  
  return transformed;
}

function resolveSourcePath(childSource, childRoot, parentRoot) {
  if (!childSource) {
    // No source specified - default to source directory relative to parent
    return path.relative(parentRoot, childRoot);
  }
  
  if (childSource.startsWith('./') || childSource.startsWith('../')) {
    // Relative path in child → resolve relative to parent
    return path.join(path.relative(parentRoot, childRoot), childSource);
  }
  
  // Absolute/NPM package → pass through unchanged
  return childSource;
}

/**
 * Combine all merged files into final manifest
 */
function combineManifest(contracts, commands, help, runtime, routes) {
  // Build final command list
  const finalCommands = [];
  const seenNames = new Set();
  
  // Process commands with parent precedence (reverse iteration for parent-first)
  const allCommands = Object.entries(commands);
  
  for (const [commandName, commandSpec] of allCommands) {
    if (seenNames.has(commandName)) continue; // Parent already defined
    
    // Create merged command with data from all file types
    const mergedCommand = {
      name: commandName,
      ...commandSpec,
      // Apply global overrides (parent wins)
      ...(runtime[commandName] || {}),
      ...(help[commandName] || {}),
      ...(routes[commandName] || {}),
      // Deep merge parameters
      parameters: mergeParameters(
        commandSpec.parameters,
        runtime[commandName]?.parameters,
        help[commandName]?.parameters
      )
    };
    
    finalCommands.push(mergedCommand);
    seenNames.add(commandName);
  }
  
  // Merge state defaults with parent precedence
  const stateDefaults = mergeStateDefaultsRecursive(contracts);
  
  return {
    ...contracts,
    stateDefaults,
    commands: finalCommands
  };
}

/**
 * Special recursive merge for state defaults (parent wins)
 */
function mergeStateDefaultsRecursive(contracts) {
  if (!contracts.stateDefaults) return {};
  
  let merged = { ...contracts.stateDefaults };
  
  // Recursively merge sources (parent overrides child)
  if (contracts.sources && typeof contracts.sources === 'object') {
    for (const sourcePath of Object.values(contracts.sources)) {
      try {
        const resolvedPath = validateSourcePath(sourcePath, process.cwd());
        if (fs.existsSync(resolvedPath)) {
          const childContract = loadJSONFile(resolvedPath, 'contract.json');
          if (childContract && childContract.stateDefaults) {
            merged = deepMerge(childContract.stateDefaults, merged);
          }
        }
      } catch (error) {
        console.warn(`⚠️ Failed to merge state defaults from source '${sourcePath}': ${error.message}`);
      }
    }
  }
  
  return merged;
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
    // Only throw for required files
    if (filename === 'contract.json' || filename === 'commands.json') {
      throw new Error(`Required manifest file not found: ${filename}`);
    }
    return {};
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`Failed to parse ${filename}: ${error.message}`);
  }
}

/**
 * Validate that source path is within project root
 */
function validateSourcePath(sourcePath, projectRoot) {
  const resolvedPath = path.resolve(projectRoot, sourcePath);
  const relativeToRoot = path.relative(projectRoot, resolvedPath);

  // Prevent going outside project root
  if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) {
    throw new Error(`Source path '${sourcePath}' must be within project root`);
  }

  return resolvedPath;
}

/**
 * Deep merge objects
 */
function deepMerge(target, source) {
  const result = { ...target };

  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = deepMerge(result[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }

  return result;
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

// Keep the existing validation and reader
export function validateManifest(manifest) {
  const errors = [];

  if (!manifest.commands || !Array.isArray(manifest.commands)) {
    errors.push('Manifest must contain a commands array');
  } else {
    manifest.commands.forEach((command, index) => {
      if (!command.name) {
        errors.push(`Command at index ${index} missing name property`);
      }
      if (!command.commandType) {
        errors.push(`Command '${command.name}' missing commandType`);
      }
      if (command.commandType === 'native-method' && !command.methodName) {
        errors.push(`Native-method command '${command.name}' missing methodName property`);
      }
    });
  }

  if (errors.length > 0) {
    throw new Error(`Manifest validation failed:\n- ${errors.join('\n- ')}`);
  }

  return true;
}

export function manifestReader(projectRoot) {
  return loadManifest(projectRoot);
}