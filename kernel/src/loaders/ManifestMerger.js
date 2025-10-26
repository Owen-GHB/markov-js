export class ManifestMerger {
    /**
     * Apply namespace prefix to commands
     */
    static namespaceCommands(commands, namespace) {
        if (!namespace) return { ...commands };
        
        const namespaced = {};
        for (const [commandName, commandSpec] of Object.entries(commands)) {
            const fullPath = `${namespace}/${commandName}`;
            namespaced[fullPath] = { ...commandSpec, name: fullPath };
        }
        return namespaced;
    }

    /**
     * Transform command sources with projectRoot context
     */
    static transformCommandSources(commands, childRoot, projectRoot, reader) {
        const transformed = {};
        for (const [commandName, commandSpec] of Object.entries(commands)) {
            transformed[commandName] = {
                ...commandSpec,
                source: reader.resolveSourcePath(commandSpec.source, childRoot, projectRoot),
            };
        }
        return transformed;
    }

    /**
     * Deep merge objects
     */
    static deepMerge(target, source) {
        const result = { ...target };
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.deepMerge(result[key] || {}, source[key]);
            } else {
                result[key] = source[key];
            }
        }
        return result;
    }
}