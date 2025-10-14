export class ContractScanner {
    name = 'ContractScanner';
    
    async scan(manifest, projectRoot, issueReporter) {
        // Check for missing contract entirely
        if (!manifest) {
            issueReporter.addIssue({
                type: 'contract',
                severity: 'error',
                message: 'No contract manifest found',
                suggestion: 'Ensure contract.json and related files exist in project root'
            });
            return;
        }
        
        // Check for missing commands
        if (!manifest.commands) {
            issueReporter.addIssue({
                type: 'contract',
                severity: 'error',
                message: 'No commands array found in contract',
                suggestion: 'Add commands to commands.json or define sources in contract.json'
            });
            return;
        }
        
        // Check for empty commands
        if (manifest.commands.length === 0) {
            issueReporter.addIssue({
                type: 'contract',
                severity: 'warning',
                message: 'Commands array is empty',
                suggestion: 'Add commands to commands.json or define sources that provide commands'
            });
            return;
        }
        
        // Validate each command has required properties
        this.validateCommandProperties(manifest.commands, issueReporter);
        
        // Report successful load
        issueReporter.addIssue({
            type: 'contract',
            severity: 'info',
            message: `Contract loaded with ${manifest.commands.length} commands`
        });
    }
    
    validateCommandProperties(commands, issueReporter) {
        const commandsMissingName = [];
        const commandsMissingType = [];
        const commandsWithInvalidType = [];
        
        commands.forEach((command, index) => {
            // Check for name
            if (!command.name || command.name.trim() === '') {
                commandsMissingName.push(`command at index ${index}`);
            }
            
            // Check for commandType
            if (!command.commandType) {
                commandsMissingType.push(command.name || `command at index ${index}`);
            } else {
                // Validate commandType is one of the supported types
                const validTypes = ['native-method', 'kernel-plugin', 'internal'];
                if (!validTypes.includes(command.commandType)) {
                    commandsWithInvalidType.push(`${command.name} (${command.commandType})`);
                }
            }
            
            // Validate commandType-specific required properties
            this.validateCommandTypeSpecific(command, issueReporter);
        });
        
        // Report aggregated issues
        if (commandsMissingName.length > 0) {
            issueReporter.addIssue({
                type: 'command-validation',
                severity: 'error',
                message: `Commands missing name: ${commandsMissingName.join(', ')}`,
                suggestion: 'Every command must have a name property'
            });
        }
        
        if (commandsMissingType.length > 0) {
            issueReporter.addIssue({
                type: 'command-validation',
                severity: 'error',
                message: `Commands missing commandType: ${commandsMissingType.join(', ')}`,
                suggestion: 'Every command must have a commandType property'
            });
        }
        
        if (commandsWithInvalidType.length > 0) {
            issueReporter.addIssue({
                type: 'command-validation',
                severity: 'error',
                message: `Commands with invalid commandType: ${commandsWithInvalidType.join(', ')}`,
                suggestion: 'commandType must be one of: native-method, kernel-plugin, internal'
            });
        }
    }
    
    validateCommandTypeSpecific(command, issueReporter) {
        switch (command.commandType) {
            case 'native-method':
                this.validateNativeMethodCommand(command, issueReporter);
                break;
            case 'kernel-plugin':
                this.validateKernelPluginCommand(command, issueReporter);
                break;
            case 'internal':
                this.validateInternalCommand(command, issueReporter);
                break;
        }
    }
    
    validateNativeMethodCommand(command, issueReporter) {
        if (!command.methodName) {
            issueReporter.addIssue({
                type: 'command-validation',
                severity: 'error',
                command: command.name,
                message: 'Native method command missing methodName',
                suggestion: 'native-method commands must specify methodName'
            });
        }
        
        // Source is optional for native-method (defaults to project root)
        // But if source is provided, it should be a string
        if (command.source && typeof command.source !== 'string') {
            issueReporter.addIssue({
                type: 'command-validation',
                severity: 'warning',
                command: command.name,
                message: 'Source should be a string path',
                suggestion: 'Source should be a relative path string or omitted to use project root'
            });
        }
    }
    
    validateKernelPluginCommand(command, issueReporter) {
        if (!command.methodName) {
            issueReporter.addIssue({
                type: 'command-validation',
                severity: 'error',
                command: command.name,
                message: 'Kernel plugin command missing methodName',
                suggestion: 'kernel-plugin commands must specify methodName'
            });
        }
        
        // Source is optional for kernel-plugin (defaults to command-plugins)
        if (command.source && typeof command.source !== 'string') {
            issueReporter.addIssue({
                type: 'command-validation',
                severity: 'warning',
                command: command.name,
                message: 'Source should be a string path',
                suggestion: 'Source should be a relative path within command-plugins'
            });
        }
    }
    
    validateInternalCommand(command, issueReporter) {
        // Internal commands don't require methodName or source
        // They're handled declaratively by the system
        
        if (command.methodName) {
            issueReporter.addIssue({
                type: 'command-validation',
                severity: 'warning',
                command: command.name,
                message: 'Internal command has methodName (usually not needed)',
                suggestion: 'Internal commands are handled declaratively - methodName may be unnecessary'
            });
        }
        
        if (command.source) {
            issueReporter.addIssue({
                type: 'command-validation',
                severity: 'warning',
                command: command.name,
                message: 'Internal command has source (usually not needed)',
                suggestion: 'Internal commands are handled by the kernel - source may be unnecessary'
            });
        }
    }
}

export default ContractScanner;