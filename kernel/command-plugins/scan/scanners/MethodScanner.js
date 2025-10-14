import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

export class MethodScanner {
    name = 'MethodScanner';
    
    async scan(manifest, projectRoot, issueReporter) {
        if (!manifest.commands || manifest.commands.length === 0) {
            return; // No commands to check
        }
        
        console.log(`MethodScanner checking ${manifest.commands.length} commands`);
        
        // Group commands by source for efficient checking
        const commandsBySource = this.groupCommandsBySource(manifest.commands);
        
        // Check each source
        for (const [sourcePath, commands] of Object.entries(commandsBySource)) {
            await this.validateSourceMethods(sourcePath, commands, projectRoot, issueReporter);
        }
    }
    
    groupCommandsBySource(commands) {
        const grouped = {};
        
        commands.forEach(command => {
            if (command.commandType === 'native-method' && command.methodName) {
                const source = command.source || './'; // Default to project root
                if (!grouped[source]) {
                    grouped[source] = [];
                }
                grouped[source].push(command);
            }
        });
        
        return grouped;
    }
    
    async validateSourceMethods(sourcePath, commands, projectRoot, issueReporter) {
        const resolvedPath = this.resolveSourcePath(sourcePath, projectRoot);
        
        // Check if source file/directory exists
        if (!fs.existsSync(resolvedPath)) {
            commands.forEach(command => {
                issueReporter.addIssue({
                    type: 'method-existence',
                    severity: 'error',
                    command: command.name,
                    message: `Source path not found: ${sourcePath}`,
                    suggestion: `Check that source path '${sourcePath}' exists and is accessible`
                });
            });
            return;
        }
        
        try {
            // Try to import the module
            const moduleUrl = pathToFileURL(resolvedPath).href;
            const module = await import(moduleUrl);
            
            // Check each command's method in this source
            for (const command of commands) {
                await this.validateMethod(command, module, issueReporter);
            }
            
        } catch (error) {
            // Failed to load module
            commands.forEach(command => {
                issueReporter.addIssue({
                    type: 'method-existence',
                    severity: 'error',
                    command: command.name,
                    message: `Failed to load source ${sourcePath}: ${error.message}`,
                    suggestion: `Ensure ${sourcePath} is a valid ES module and exports the required methods`
                });
            });
        }
    }
    
    async validateMethod(command, module, issueReporter) {
        const methodName = command.methodName;
        
        if (typeof module[methodName] !== 'function') {
            issueReporter.addIssue({
                type: 'method-existence',
                severity: 'error',
                command: command.name,
                message: `Method '${methodName}' not exported or not a function`,
                suggestion: `Ensure '${methodName}' is exported as a function from the source module`
            });
            return;
        }
        
        // Success - method exists and is a function
        issueReporter.addIssue({
            type: 'method-existence',
            severity: 'info',
            command: command.name,
            message: `Method '${methodName}' found and is a function`
        });
        
        // Optional: Check if it's obviously async when declared as sync
        if (command.syncMethod === true) {
            this.checkSyncMethodDeclaration(command, module[methodName], issueReporter);
        }
    }
    
    checkSyncMethodDeclaration(command, method, issueReporter) {
        // Basic check for obviously async functions
        if (method.constructor.name === 'AsyncFunction') {
            issueReporter.addIssue({
                type: 'method-existence',
                severity: 'warning',
                command: command.name,
                message: `Method '${command.methodName}' is declared as sync but is an async function`,
                suggestion: 'Remove syncMethod: true or make the function synchronous'
            });
        }
    }
    
    resolveSourcePath(sourcePath, projectRoot) {
        // Handle directory imports by resolving to index.js like ResourceLoader does
        let resolvedPath = path.resolve(projectRoot, sourcePath);
        
        if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isDirectory()) {
            const indexPath = path.join(resolvedPath, 'index.js');
            if (fs.existsSync(indexPath)) {
                resolvedPath = indexPath;
            } else {
                // Directory exists but no index.js - this might be an issue
                return resolvedPath; // Let the import fail with a clear error
            }
        } else if (!resolvedPath.endsWith('.js') && !resolvedPath.endsWith('.mjs')) {
            // Try with .js extension
            const jsPath = resolvedPath + '.js';
            if (fs.existsSync(jsPath)) {
                resolvedPath = jsPath;
            }
        }
        
        return resolvedPath;
    }
}

export default MethodScanner;