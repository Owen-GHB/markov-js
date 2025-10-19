import path from 'path';

/**
 * Validate that a resolved path doesn't escape the project root
 */
export function validatePathSecurity(resolvedPath, projectRoot, originalPath) {
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
export function resolveSecurePath(projectRoot, originalPath) {
    if (!originalPath) return null;
    
    const resolvedPath = path.resolve(projectRoot, originalPath);
    return validatePathSecurity(resolvedPath, projectRoot, originalPath);
}