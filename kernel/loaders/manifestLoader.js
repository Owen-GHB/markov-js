// manifestLoader.js
import fs from 'fs';
import path from 'path';

/**
 * Loads and merges manifest from the new 4-file structure with recursive sources
 * @param {string} projectRoot - Root directory of the project
 * @param {string} sourceContext - Context for error messages (internal use)
 * @returns {Object} - Complete merged manifest
 */
export function loadManifest(projectRoot, sourceContext = 'main application') {
  // Load the four core files
  const contract = loadJSONFile(projectRoot, 'contract.json');
  const commands = loadJSONFile(projectRoot, 'commands.json');
  const runtime = loadJSONFile(projectRoot, 'runtime.json', {}); // Optional
  const help = loadJSONFile(projectRoot, 'help.json', {}); // Optional
  const routes = loadJSONFile(projectRoot, 'routes.json', {}); // Optional

  // Transform local commands object into array with name property
  const localCommands = Object.entries(commands).map(([commandName, commandSpec]) => {
    return {
      name: commandName,
      ...commandSpec,
      // Merge runtime and help data for this command
      ...(runtime[commandName] || {}),
      ...(help[commandName] || {}),
      ...(routes[commandName] || {}),
      // Deep merge parameters from all sources
      parameters: mergeParameters(
        commandSpec.parameters,
        runtime[commandName]?.parameters,
        help[commandName]?.parameters
      )
    };
  });

  // Track all source manifests for state merging
  const sourceManifests = [];
  let sourceCommands = [];

  // Expand sources if they exist
  if (contract.sources && typeof contract.sources === 'object') {
    try {
      const expansionResult = expandSourceCommands(contract.sources, projectRoot, sourceContext);
      sourceCommands = expansionResult.commands;
      sourceManifests.push(...expansionResult.manifests);
    } catch (error) {
      console.warn(`⚠️  Failed to expand sources in ${sourceContext}: ${error.message}`);
    }
  }

  // Merge state defaults
  const mergedStateDefaults = mergeStateDefaults(contract.stateDefaults, sourceManifests);

  // Build final command list with conflict detection
  const allCommands = [];
  const seenNames = new Set();

  function addCommand(command, source = 'local') {
    if (seenNames.has(command.name)) {
      console.warn(`⚠️  Command name conflict in ${sourceContext}: '${command.name}' from ${source} will be ignored`);
      return;
    }
    seenNames.add(command.name);
    allCommands.push(command);
  }

  // Add source commands first (lower priority)
  sourceCommands.forEach(cmd => addCommand(cmd, 'source'));
  // Add local commands second (higher priority - will override conflicts)
  localCommands.forEach(cmd => addCommand(cmd, 'local'));

  return {
    ...contract,
    stateDefaults: mergedStateDefaults,
    commands: allCommands
  };
}

/**
 * Expand source commands recursively
 */
function expandSourceCommands(sources, projectRoot, context) {
  const sourceCommands = [];
  const sourceManifests = [];

  for (const [sourceName, sourcePath] of Object.entries(sources)) {
    try {
      const resolvedPath = validateSourcePath(sourcePath, projectRoot);
      
      if (!fs.existsSync(resolvedPath)) {
        console.warn(`⚠️  Source directory not found: ${sourcePath} (resolved to ${resolvedPath})`);
        continue;
      }

      const sourceManifest = loadSourceManifest(resolvedPath, sourceName);
      if (!sourceManifest) continue;

      sourceManifests.push(sourceManifest);

      // Transform and add commands from this source
      const transformedCommands = transformSourceCommands(
        sourceManifest.commands || [],
        sourcePath,
        projectRoot
      );
      sourceCommands.push(...transformedCommands);

    } catch (error) {
      console.warn(`⚠️  Failed to load source '${sourceName}' in ${context}: ${error.message}`);
    }
  }

  return { commands: sourceCommands, manifests: sourceManifests };
}

/**
 * Load a source manifest recursively
 */
function loadSourceManifest(sourceDir, sourceName) {
  try {
    return loadManifest(sourceDir, `source '${sourceName}'`);
  } catch (error) {
    console.warn(`⚠️  Failed to load manifest from source '${sourceName}': ${error.message}`);
    return null;
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
 * Transform source commands with proper path resolution
 */
function transformSourceCommands(commands, sourceBasePath, parentProjectRoot) {
  return commands.map(command => ({
    ...command,
    // Transform source paths to be relative to parent project root
    source: resolveSourcePath(command.source, sourceBasePath, parentProjectRoot)
  }));
}

/**
 * Resolve source paths from child to parent context
 */
function resolveSourcePath(childSource, sourceBasePath, parentProjectRoot) {
  if (!childSource) {
    // No source in child → point to source directory relative to parent
    return sourceBasePath;
  }

  if (childSource.startsWith('./') || childSource.startsWith('../')) {
    // Relative path in child → join with source base path
    return path.join(sourceBasePath, childSource);
  }

  // Absolute/NPM package → pass through unchanged
  return childSource;
}

/**
 * Merge state defaults from all sources
 */
function mergeStateDefaults(parentState = {}, sourceManifests = []) {
  return sourceManifests.reduce((mergedState, sourceManifest) => {
    if (sourceManifest.stateDefaults) {
      return deepMerge(mergedState, sourceManifest.stateDefaults);
    }
    return mergedState;
  }, { ...parentState });
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

// Updated version that works with the new loader
export function manifestReader(projectRoot) {
  return loadManifest(projectRoot);
}