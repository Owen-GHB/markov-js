// utils/ResourceLoader.js
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

export class ResourceLoader {
    constructor(baseDir = null) {
        this.cache = new Map();
        this.baseDir = baseDir;
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
            
            if (!fs.existsSync(resolvedPath)) {
                throw new Error(`Resource not found: ${resolvedPath}`);
            }

            const moduleUrl = pathToFileURL(resolvedPath).href;
            const resource = await import(moduleUrl);
            
            this.cache.set(resourceKey, resource);
            return resource;
        } catch (error) {
            console.warn(`⚠️ Failed to load resource '${resourceKey}':`, error.message);
            throw error; // Re-throw so callers can handle appropriately
        }
    }

    /**
     * Default path resolver
     */
    defaultResolver(resourceKey, baseDir = this.baseDir) {
        // Handle relative paths
        if (resourceKey.startsWith('./') || resourceKey.startsWith('../')) {
            if (!baseDir) {
                throw new Error(`Cannot resolve local resource '${resourceKey}': baseDir not available`);
            }
            let resolvedPath = path.resolve(baseDir, resourceKey);
            
            // Directory handling logic
            if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory()) {
                const packageJsonPath = path.join(resolvedPath, 'package.json');
                if (fs.existsSync(packageJsonPath)) {
                    try {
                        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                        resolvedPath = path.resolve(resolvedPath, packageJson.main || 'index.js');
                    } catch {
                        resolvedPath = path.join(resolvedPath, 'index.js');
                    }
                } else {
                    resolvedPath = path.join(resolvedPath, 'index.js');
                }
            }
            
            // Ensure .js extension
            if (!resolvedPath.endsWith('.js') && !resolvedPath.endsWith('.mjs')) {
                resolvedPath += '.js';
            }
            
            return resolvedPath;
        }
        
        // Plugin-style paths
        if (baseDir) {
            return path.join(baseDir, resourceKey, 'index.js');
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
            const availableMethods = Object.keys(resource).filter(key => typeof resource[key] === 'function');
            throw new Error(
                `Method '${methodName}' not found in resource '${resourceKey}'. ` +
                `Available methods: ${availableMethods.join(', ') || 'none'}`
            );
        }
        
        return resource[methodName];
    }

    // Cache management methods
    has(key) { return this.cache.has(key); }
    set(key, resource) { this.cache.set(key, resource); }
    delete(key) { return this.cache.delete(key); }
    clear() { this.cache.clear(); }
    getStats() { 
        return { 
            size: this.cache.size, 
            keys: Array.from(this.cache.keys()) 
        }; 
    }
}