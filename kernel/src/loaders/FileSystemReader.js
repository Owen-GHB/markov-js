import fs from 'fs';
import path from 'path';

export class FileSystemReader {
    /**
     * Load JSON file from filesystem
     */
    loadJSONFile(projectRoot, filename, defaultValue = null) {
        const filePath = path.join(projectRoot, filename);
        
        if (!this.existsSync(filePath)) {
            if (defaultValue !== null) return defaultValue;
            if (filename === 'contract.json' || filename === 'commands.json') {
                throw new Error(`Required file not found: ${filename}`);
            }
            return {};
        }
        
        try {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(fileContent);
        } catch (error) {
            throw new Error(`Failed to parse ${filename}: ${error.message}`);
        }
    }

    /**
     * Validate that source path doesn't escape root directory
     */
    validateSourcePath(sourcePath, currentRoot) {
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

    /**
     * Resolve source paths relative to project root
     */
    resolveSourcePath(childSource, childRoot, projectRoot) {
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
     * Check if path exists
     */
    existsSync(filePath) {
        return fs.existsSync(filePath);
    }

    /**
     * Get absolute path (utility method)
     */
    resolvePath(...paths) {
        return path.resolve(...paths);
    }

    /**
     * Join paths (utility method)  
     */
    joinPaths(...paths) {
        return path.join(...paths);
    }

        /**
     * Check if path is a directory
     */
    isDirectory(filePath) {
        try {
            return fs.statSync(filePath).isDirectory();
        } catch {
            return false;
        }
    }

    /**
     * Read file as string
     */
    readFileSync(filePath, encoding = 'utf8') {
        return fs.readFileSync(filePath, encoding);
    }

    /**
     * Get directory name from path
     */
    dirname(filePath) {
        return path.dirname(filePath);
    }

    /**
     * Get file extension
     */
    extname(filePath) {
        return path.extname(filePath);
    }

    /**
     * Check if path has specific extension
     */
    hasExtension(filePath, extensions) {
        const ext = this.extname(filePath).toLowerCase();
        return extensions.includes(ext);
    }
}