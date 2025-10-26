import { pathToFileURL } from 'url';
import { FileSystemReader } from './FileSystemReader.js';

export class ResourceLoader {
    constructor(baseDir = null, fileSystemReader = new FileSystemReader()) {
        this.cache = new Map();
        this.baseDir = baseDir;
        this.fs = fileSystemReader;
    }

    /**
     * Universal resource loader
     */
    async getResource(resourceKey, customResolver = null) {
        if (this.cache.has(resourceKey)) {
            return this.cache.get(resourceKey);
        }

        try {
            // Use custom resolver if provided, otherwise use default path resolution
            const resolvedPath = customResolver
                ? await customResolver(resourceKey, this.baseDir)
                : this.defaultResolver(resourceKey);

            if (!this.fs.existsSync(resolvedPath)) {
                throw new Error(`Resource not found: ${resolvedPath}`);
            }

            const moduleUrl = pathToFileURL(resolvedPath).href;
            const resource = await import(moduleUrl);

            this.cache.set(resourceKey, resource);
            return resource;
        } catch (error) {
            console.warn(
                `⚠️ Failed to load resource '${resourceKey}':`,
                error.message,
            );
            throw error;
        }
    }

    /**
     * Default path resolver
     */
    defaultResolver(resourceKey, baseDir = this.baseDir) {
        // Handle relative paths
        if (resourceKey.startsWith('./') || resourceKey.startsWith('../')) {
            if (!baseDir) {
                throw new Error(
                    `Cannot resolve local resource '${resourceKey}': baseDir not available`,
                );
            }
            let resolvedPath = this.fs.resolvePath(baseDir, resourceKey);

            // Directory handling logic
            if (this.fs.existsSync(resolvedPath) && this.fs.isDirectory(resolvedPath)) {
                const packageJsonPath = this.fs.joinPaths(resolvedPath, 'package.json');
                if (this.fs.existsSync(packageJsonPath)) {
                    try {
                        const packageJson = JSON.parse(
                            this.fs.readFileSync(packageJsonPath, 'utf8'),
                        );
                        resolvedPath = this.fs.resolvePath(
                            resolvedPath,
                            packageJson.main || 'index.js',
                        );
                    } catch {
                        resolvedPath = this.fs.joinPaths(resolvedPath, 'index.js');
                    }
                } else {
                    resolvedPath = this.fs.joinPaths(resolvedPath, 'index.js');
                }
            }

            // Ensure .js extension
            if (!this.fs.hasExtension(resolvedPath, ['.js', '.mjs'])) {
                resolvedPath += '.js';
            }

            return resolvedPath;
        }

        // Plugin-style paths
        if (baseDir) {
            return this.fs.joinPaths(baseDir, resourceKey, 'index.js');
        }

        // Absolute/NPM package paths
        return resourceKey;
    }

    /**
     * Get a specific method from a resource
     */
    async getResourceMethod(resourceKey, methodName, customResolver = null) {
        const resource = await this.getResource(resourceKey, customResolver);

        if (!resource || typeof resource[methodName] !== 'function') {
            const availableMethods = Object.keys(resource).filter(
                (key) => typeof resource[key] === 'function',
            );
            throw new Error(
                `Method '${methodName}' not found in resource '${resourceKey}'. ` +
                    `Available methods: ${availableMethods.join(', ') || 'none'}`,
            );
        }

        return resource[methodName];
    }

    // Cache management methods (unchanged)
    has(key) {
        return this.cache.has(key);
    }
    set(key, resource) {
        this.cache.set(key, resource);
    }
    delete(key) {
        return this.cache.delete(key);
    }
    clear() {
        this.cache.clear();
    }
    getStats() {
        return {
            size: this.cache.size,
            keys: Array.from(this.cache.keys()),
        };
    }
}