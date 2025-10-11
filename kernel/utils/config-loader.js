import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Validate that a resolved path doesn't escape the project root
 */
function validatePathSecurity(resolvedPath, projectRoot, originalPath) {
    // Ensure the resolved path is within the project root
    if (!resolvedPath.startsWith(projectRoot)) {
        throw new Error(
            `Security violation: Path '${originalPath}' resolves to '${resolvedPath}' ` +
            `which is outside project root '${projectRoot}'`
        );
    }
    return resolvedPath;
}

/**
 * Safely resolve a path relative to project root with security validation
 */
function resolveSecurePath(originalPath, projectRoot) {
    if (!originalPath) return null;
    
    const resolvedPath = path.resolve(projectRoot, originalPath);
    return validatePathSecurity(resolvedPath, projectRoot, originalPath);
}

/**
 * Load configuration from file
 */
function loadConfigFromFile(configFilePath) {
    if (!fs.existsSync(configFilePath)) {
        throw new Error(`Configuration file does not exist: ${configFilePath}`);
    }
    return JSON.parse(fs.readFileSync(configFilePath, 'utf8'));
}

/**
 * Deep merge objects
 */
function deepMerge(target, source) {
    const result = { ...target };
    
    for (const key in source) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
            result[key] = deepMerge(target[key] || {}, source[key]);
        } else {
            result[key] = source[key];
        }
    }
    
    return result;
}

/**
 * Build plugin-specific config by merging global paths with plugin-specific paths
 */
function buildPluginConfig(globalConfig, pluginRawConfig) {
    // Start with plugin's non-path configuration
    const pluginConfig = { ...pluginRawConfig };
    
    // Merge paths: global paths + plugin-specific paths
    if (pluginRawConfig.paths) {
        pluginConfig.paths = deepMerge(
            { ...globalConfig.paths }, // Clone global paths
            pluginRawConfig.paths      // Plugin-specific paths
        );
    } else {
        // If plugin has no paths, just use global paths
        pluginConfig.paths = { ...globalConfig.paths };  // ← FIXED: was globalPaths
    }
    
    return pluginConfig;
}

/**
 * Build a complete configuration object with fully resolved paths and namespaced plugins
 */
export function buildConfig(configFilePath, projectRoot) {
    // Load raw kernel configuration
    const rawKernelConfig = loadConfigFromFile(configFilePath);

    // Calculate kernel directory (fixed relative to this file)
    const kernelDir = path.join(__dirname, '..');

    // Load plugin configurations by scanning the plugins directory
    const pluginConfigs = {};
    if (rawKernelConfig.paths?.pluginsDir) {
        const pluginsDir = resolveSecurePath(rawKernelConfig.paths.pluginsDir, projectRoot);
        
        // Scan the plugins directory for all plugin folders
        if (fs.existsSync(pluginsDir)) {
            try {
                const pluginDirs = fs.readdirSync(pluginsDir).filter(item => {
                    const itemPath = path.join(pluginsDir, item);
                    return fs.statSync(itemPath).isDirectory();
                });

                // Load config for each discovered plugin
                for (const pluginName of pluginDirs) {
                    const pluginConfigPath = path.join(pluginsDir, pluginName, 'config.json');
                    if (fs.existsSync(pluginConfigPath)) {
                        try {
                            const pluginRawConfig = JSON.parse(fs.readFileSync(pluginConfigPath, 'utf8'));
                            pluginConfigs[pluginName] = pluginRawConfig;
                        } catch (error) {
                            console.warn(`⚠️ Could not load config for plugin ${pluginName}:`, error.message);
                        }
                    } else {
                        // Plugin exists but has no config - initialize empty
                        pluginConfigs[pluginName] = {};
                    }
                }
            } catch (error) {
                console.warn(`⚠️ Could not scan plugins directory ${pluginsDir}:`, error.message);
            }
        }
    }

    // Build global paths (resolve EVERY path against project root with security validation)
    const globalPaths = {};
    for (const [key, value] of Object.entries(rawKernelConfig.paths || {})) {
        globalPaths[key] = value ? resolveSecurePath(value, projectRoot) : null;
    }

    // Add kernel-calculated paths (these are safe by construction)
    globalPaths.projectRoot = projectRoot;
    globalPaths.kernelDir = kernelDir;
    globalPaths.configFilePath = configFilePath;

    // Add utility functions for dynamic paths (with security validation)
    globalPaths.getContractManifestPath = (commandName) => {
        if (!globalPaths.contractDir) return null;
        const manifestPath = path.join(globalPaths.contractDir, commandName, 'manifest.json');
        return validatePathSecurity(manifestPath, projectRoot, `contracts/${commandName}/manifest.json`);
    };
    
    globalPaths.getContractHandlerPath = (commandName) => {
        if (!globalPaths.contractDir) return null;
        const handlerPath = path.join(globalPaths.contractDir, commandName, 'handler.js');
        return validatePathSecurity(handlerPath, projectRoot, `contracts/${commandName}/handler.js`);
    };
    
    globalPaths.getUIFilePath = (filename = 'index.html') => {
        if (!globalPaths.generatedUIDir) return null;
        const uiPath = path.join(globalPaths.generatedUIDir, filename);
        return validatePathSecurity(uiPath, projectRoot, `generated-ui/${filename}`);
    };

    // Create global config with resolved paths
    const globalConfig = {
        ...rawKernelConfig,
        paths: globalPaths,
    };

    // Build namespaced plugin configs
    const namespacedPlugins = {};
    for (const [pluginName, pluginRawConfig] of Object.entries(pluginConfigs)) {
        // Normalize plugin names (convert generate-html to generateHtml)
        const normalizedName = pluginName.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
        namespacedPlugins[normalizedName] = buildPluginConfig(globalConfig, pluginRawConfig);
    }

    // Return complete config with namespaced plugins
    return {
        ...globalConfig,
        ...namespacedPlugins,
    };
}