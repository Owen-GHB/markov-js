// File: src/manifestLoader.js
import fs from 'fs';
import path from 'path';

/**
 * MAIN ENTRY POINT - Loads complete manifest with dual recursion strategy
 */
export function loadManifest(projectRoot) {
    try {
        // Load SOURCES (5-file merge, global namespace)
        const sourcesResult = loadSourcesRecursive(projectRoot, projectRoot, "");
        
        // Load TARGETS (3-file merge, namespaced)  
        const targetsResult = loadTargetsRecursive(projectRoot, projectRoot, "");
        
        // COMBINE everything with proper precedence
        return combineManifest(sourcesResult, targetsResult, projectRoot);
    } catch (error) {
        throw new Error(`Failed to load manifest: ${error.message}`);
    }
}

/**
 * SOURCES RECURSION - 5-file merging for user-facing commands
 */
function loadSourcesRecursive(projectRoot, currentRoot, currentNamespace) {
    // Load current level's 5 files
    const contract = loadJSONFile(currentRoot, 'contract.json', {});
    const commands = loadJSONFile(currentRoot, 'commands.json', {});
    const help = loadJSONFile(currentRoot, 'help.json', {});
    const runtime = loadJSONFile(currentRoot, 'runtime.json', {});
    const routes = loadJSONFile(currentRoot, 'routes.json', {});
    
    // Transform command sources with projectRoot context
    const transformedCommands = transformCommandSources(commands, currentRoot, projectRoot);
    
    let merged = {
        contract: { ...contract },
        commands: { ...transformedCommands },
        help: { ...help },
        runtime: { ...runtime }, 
        routes: { ...routes },
        stateDefaults: contract.stateDefaults || {}
    };
    
    // Recursively merge from SOURCES (full 5-file merge)
    if (contract.sources) {
        for (const sourcePath of Object.values(contract.sources)) {
            try {
                const resolvedPath = validateSourcePath(sourcePath, currentRoot);
                if (fs.existsSync(resolvedPath)) {
                    const childResult = loadSourcesRecursive(projectRoot, resolvedPath, currentNamespace);
                    merged = deepMergeSources(childResult, merged);
                }
            } catch (error) {
                console.warn(`⚠️ Failed to merge source '${sourcePath}': ${error.message}`);
            }
        }
    }
    
    // Sources should also recurse into their TARGETS
    if (contract.targets) {
        for (const [namespace, targetPath] of Object.entries(contract.targets)) {
            try {
                const resolvedPath = validateSourcePath(targetPath, currentRoot);
                if (fs.existsSync(resolvedPath)) {
                    // Load targets but merge them into sources (global namespace)
                    const targetResult = loadTargetsRecursive(projectRoot, resolvedPath, namespace);
                    
                    // Merge target commands into sources
                    merged.commands = { ...merged.commands, ...targetResult.commands };
                    merged.help = { ...merged.help, ...targetResult.help };
                    merged.routes = { ...merged.routes, ...targetResult.routes };
                }
            } catch (error) {
                console.warn(`⚠️ Failed to load source target '${namespace}': ${error.message}`);
            }
        }
    }
    
    return merged;
}

/**
 * TARGETS RECURSION - 3-file merging for internal commands
 */
/**
 * TARGETS RECURSION - 3-file merging for internal commands
 */
function loadTargetsRecursive(projectRoot, currentRoot, currentNamespace) {
    const contract = loadJSONFile(currentRoot, 'contract.json', {});
    const commands = loadJSONFile(currentRoot, 'commands.json', {});
    const help = loadJSONFile(currentRoot, 'help.json', {});
    const routes = loadJSONFile(currentRoot, 'routes.json', {});
    
    // Transform and namespace commands
    const transformedCommands = transformCommandSources(commands, currentRoot, projectRoot);
    const namespacedCommands = namespaceCommands(transformedCommands, currentNamespace);
    const namespacedHelp = namespaceCommands(help, currentNamespace);
    const namespacedRoutes = namespaceRoutes(routes, currentNamespace);
    
    let merged = {
        commands: { ...namespacedCommands },
        help: { ...namespacedHelp },
        routes: { ...namespacedRoutes }
    };
    
    // Sources within targets should be 3-file merged into target namespace
    if (contract.sources) {
        for (const sourcePath of Object.values(contract.sources)) {
            try {
                const resolvedPath = validateSourcePath(sourcePath, currentRoot);
                if (fs.existsSync(resolvedPath)) {
                    // Load sources but treat them as targets (3-file merge, namespaced)
                    const childResult = loadTargetsRecursive(projectRoot, resolvedPath, currentNamespace);
                    merged.commands = { ...merged.commands, ...childResult.commands }; // Parent wins
                    merged.help = { ...merged.help, ...childResult.help };
                    merged.routes = { ...merged.routes, ...childResult.routes };
                }
            } catch (error) {
                console.warn(`⚠️ Failed to merge target source '${sourcePath}': ${error.message}`);
            }
        }
    }
    
    // Recursively process TARGETS within targets (namespaced merge)
    if (contract.targets) {
        for (const [namespace, targetPath] of Object.entries(contract.targets)) {
            try {
                const resolvedPath = validateSourcePath(targetPath, currentRoot);
                if (fs.existsSync(resolvedPath)) {
                    const newNamespace = currentNamespace ? `${currentNamespace}/${namespace}` : namespace;
                    const childResult = loadTargetsRecursive(projectRoot, resolvedPath, newNamespace);
                    merged.commands = { ...childResult.commands, ...merged.commands }; // Parent wins
                    merged.help = { ...childResult.help, ...merged.help };
                    merged.routes = { ...childResult.routes, ...merged.routes };
                }
            } catch (error) {
                console.warn(`⚠️ Failed to load target '${namespace}': ${error.message}`);
            }
        }
    }
    
    return merged;
}

/**
 * Apply namespace prefix to commands
 */
function namespaceCommands(commands, namespace) {
    if (!namespace) return { ...commands };
    
    const namespaced = {};
    for (const [commandName, commandSpec] of Object.entries(commands)) {
        const fullPath = `${namespace}/${commandName}`;
        namespaced[fullPath] = { ...commandSpec, name: fullPath };
    }
    return namespaced;
}

/**
 * Apply namespace prefix to route next commands
 */
function namespaceRoutes(routes, namespace) {
    if (!namespace) return { ...routes };
    
    const namespaced = {};
    for (const [routeName, routeConfig] of Object.entries(routes)) {
        if (routeConfig.next) {
            const namespacedNext = {};
            for (const [nextCommand, nextConfig] of Object.entries(routeConfig.next)) {
                const fullNextPath = nextCommand.includes('/') ? nextCommand : `${namespace}/${nextCommand}`;
                namespacedNext[fullNextPath] = nextConfig;
            }
            namespaced[routeName] = { ...routeConfig, next: namespacedNext };
        } else {
            namespaced[routeName] = routeConfig;
        }
    }
    return namespaced;
}

/**
 * Combine sources and targets into final manifest
 */
function combineManifest(sourcesResult, targetsResult, projectRoot) {
    // Merge commands with parent precedence (sources win over targets for same name)
    const allCommands = {
        ...targetsResult.commands,
        ...sourcesResult.commands  // Sources override targets
    };
    
    // Apply runtime and help overrides to commands
    const finalCommands = {};
    for (const [commandName, commandSpec] of Object.entries(allCommands)) {
        finalCommands[commandName] = {
            name: commandName,
            ...commandSpec,
            ...(sourcesResult.runtime[commandName] || {}),
            ...(sourcesResult.help[commandName] || targetsResult.help[commandName] || {}),
            ...(sourcesResult.routes[commandName] || targetsResult.routes[commandName] || {}),
            parameters: mergeParameters(
                commandSpec.parameters,
                sourcesResult.runtime[commandName]?.parameters,
                sourcesResult.help[commandName]?.parameters,
                targetsResult.help[commandName]?.parameters
            ),
        };
    }
    
    return {
        ...sourcesResult.contract,
        stateDefaults: sourcesResult.stateDefaults,
        commands: finalCommands
    };
}

// ============================================================================
// 🛠️ KEEP ALL EXISTING UTILITIES (they work great!)
// ============================================================================

/**
 * TRANSFORM COMMAND SOURCES - Your existing working code
 */
function transformCommandSources(commands, childRoot, projectRoot) {
    const transformed = {};
    for (const [commandName, commandSpec] of Object.entries(commands)) {
        transformed[commandName] = {
            ...commandSpec,
            source: resolveSourcePath(commandSpec.source, childRoot, projectRoot),
        };
    }
    return transformed;
}

/**
 * RESOLVE SOURCE PATHS - Your existing working code  
 */
function resolveSourcePath(childSource, childRoot, projectRoot) {
    if (!childSource) {
        return path.relative(projectRoot, childRoot);
    }
    if (childSource.startsWith('./') || childSource.startsWith('../')) {
        const absolutePath = path.resolve(childRoot, childSource);
        return path.relative(projectRoot, absolutePath);
    }
    return childSource;
}

/**
 * DEEP MERGE SOURCES - Enhanced for dual structure
 */
function deepMergeSources(target, source) {
    return {
        contract: deepMerge(target.contract, source.contract),
        commands: { ...source.commands, ...target.commands }, // Parent wins
        help: { ...source.help, ...target.help },
        runtime: { ...source.runtime, ...target.runtime },
        routes: { ...source.routes, ...target.routes },
        stateDefaults: deepMerge(target.stateDefaults, source.stateDefaults)
    };
}

/**
 * DEEP MERGE OBJECTS - Your existing working code
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
 * MERGE PARAMETERS - Your existing working code
 */
function mergeParameters(...paramSources) {
    const merged = {};
    for (const params of paramSources) {
        if (!params || typeof params !== 'object') continue;
        for (const [paramName, paramSpec] of Object.entries(params)) {
            if (merged[paramName]) {
                merged[paramName] = deepMerge(merged[paramName], paramSpec);
            } else {
                merged[paramName] = { ...paramSpec };
            }
        }
    }
    return merged;
}

/**
 * LOAD JSON FILE - Your existing working code
 */
function loadJSONFile(projectRoot, filename, defaultValue = null) {
    const filePath = path.join(projectRoot, filename);
    if (!fs.existsSync(filePath)) {
        if (defaultValue !== null) return defaultValue;
        if (filename === 'contract.json' || filename === 'commands.json') {
            throw new Error(`Required file not found: ${filename}`);
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
 * VALIDATE SOURCE PATH - Your existing working code
 */
function validateSourcePath(sourcePath, currentRoot) {
    if (typeof sourcePath !== 'string') {
        throw new Error(`Invalid source path: ${typeof sourcePath}`);
    }
    const resolvedPath = path.resolve(currentRoot, sourcePath);
    const relativeToRoot = path.relative(currentRoot, resolvedPath);
    if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) {
        throw new Error(`Source path cannot escape root: ${sourcePath}`);
    }
    return resolvedPath;
}