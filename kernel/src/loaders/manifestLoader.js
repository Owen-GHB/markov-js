// loaders/manifestLoader.js
import { FileSystemReader } from './FileSystemReader.js';
import { ManifestMerger } from './ManifestMerger.js';

/**
 * MAIN ENTRY POINT - Loads complete manifest
 */
export function loadManifest(projectRoot) {
    const reader = new FileSystemReader();
    
    try {
        // Load SOURCES with parent-wins merge
        const sourcesResult = loadSources(projectRoot, projectRoot, reader);
        
        // Load and merge TARGETS with target-wins precedence
        const targetsResult = loadTargets(projectRoot, projectRoot, "", reader);
        
        // SMART MERGE: Targets win for implementation, but preserve sources' unique properties
        const finalCommands = { ...sourcesResult.commands };
        for (const [targetName, targetCmd] of Object.entries(targetsResult.commands || {})) {
            if (finalCommands[targetName]) {
                // Merge with TARGET WINNING: child properties override, parent keeps unique ones
                finalCommands[targetName] = {
                    ...finalCommands[targetName], // Parent properties
                    ...targetCmd                  // Child wins for any overlapping properties
                };
            } else {
                finalCommands[targetName] = targetCmd;
            }
        }
        
        return {
            ...sourcesResult,
            commands: finalCommands
        };
    } catch (error) {
        throw new Error(`Failed to load manifest: ${error.message}`);
    }
}

/**
 * SOURCES - Parent wins merge (no recursion into targets)
 */
function loadSources(projectRoot, currentRoot, reader) {
    // Load current manifest
    const manifest = reader.loadJSONFile(currentRoot, 'contract.json', {});
    
    // Transform command sources with projectRoot context
    const transformedCommands = ManifestMerger.transformCommandSources(
        manifest.commands || {}, 
        currentRoot, 
        projectRoot, 
        reader
    );
    
    // Start with current manifest, replacing commands with transformed ones
    let merged = {
        ...manifest,
        commands: { ...transformedCommands }
    };
    
    // Flat merge of sources (parent wins)
    if (manifest.sources) {
        for (const sourcePath of Object.values(manifest.sources)) {
            try {
                const resolvedPath = reader.validateSourcePath(sourcePath, currentRoot);
                if (reader.existsSync(resolvedPath)) {
                    const childResult = loadSources(projectRoot, resolvedPath, reader);
                    // PARENT WINS for sources
                    merged = ManifestMerger.deepMerge(childResult, merged);
                }
            } catch (error) {
                console.warn(`⚠️ Failed to merge source '${sourcePath}': ${error.message}`);
            }
        }
    }
    
    return merged;
}

/**
 * TARGETS - Target wins merge with recursion
 */
function loadTargets(projectRoot, currentRoot, currentNamespace, reader) {
    // Load current manifest
    const manifest = reader.loadJSONFile(currentRoot, 'contract.json', {});
    
    // Start with this target's own commands
    const sourceCommands = manifest.commands || {};
    const transformedCommands = ManifestMerger.transformCommandSources(
        sourceCommands, 
        currentRoot, 
        projectRoot, 
        reader
    );
    const namespacedCommands = ManifestMerger.namespaceCommands(
        transformedCommands, 
        currentNamespace
    );
    
    let mergedCommands = { ...namespacedCommands };
    
    // Process child targets with SMART MERGE
    if (manifest.targets) {
        for (const [namespace, targetPath] of Object.entries(manifest.targets)) {
            try {
                const resolvedPath = reader.validateSourcePath(targetPath, currentRoot);
                if (reader.existsSync(resolvedPath)) {
                    const newNamespace = currentNamespace ? `${currentNamespace}/${namespace}` : namespace;
                    const childResult = loadTargets(projectRoot, resolvedPath, newNamespace, reader);
                    
                    // SMART MERGE: Child wins for implementation, but preserve parent's unique properties
                    for (const [childName, childCmd] of Object.entries(childResult.commands || {})) {
                        if (mergedCommands[childName]) {
                            // Merge with CHILD WINNING: child properties override, parent keeps unique ones
                            mergedCommands[childName] = {
                                ...mergedCommands[childName], // Parent properties
                                ...childCmd                  // Child wins for any overlapping properties
                            };
                        } else {
                            // New command from child
                            mergedCommands[childName] = childCmd;
                        }
                    }
                }
            } catch (error) {
                console.warn(`⚠️ Failed to load target '${namespace}': ${error.message}`);
            }
        }
    }
    
    return {
        commands: mergedCommands
    };
}