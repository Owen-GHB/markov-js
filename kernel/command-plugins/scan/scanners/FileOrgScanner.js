import fs from 'fs';
import path from 'path';

export class FileOrgScanner {
    name = 'FileOrgScanner';
    
    async scan(manifest, projectRoot, issueReporter, fix = false) {
        this.fixMode = fix;
        this.issueReporter = issueReporter;
        
        console.log('FileOrgScanner checking file organization');
        
        // Check root project files
        await this.checkProjectFiles(projectRoot, 'root', issueReporter);
        
        // Recursively check all source directories
        if (manifest.sources) {
            await this.checkSourceFilesRecursive(manifest.sources, projectRoot, issueReporter);
        }
    }
    
    async checkProjectFiles(projectRoot, sourcePath, issueReporter) {
        // Check each of the 4 contract files for proper property placement
        await this.checkCommandsJson(projectRoot, sourcePath, issueReporter);
        await this.checkRuntimeJson(projectRoot, sourcePath, issueReporter);
        await this.checkHelpJson(projectRoot, sourcePath, issueReporter);
        await this.checkContractJson(projectRoot, sourcePath, issueReporter);
        
        // Check parameter consistency across files
        await this.checkParameterConsistency(projectRoot, sourcePath, issueReporter);
    }
    
    async checkSourceFilesRecursive(sources, parentRoot, issueReporter, parentPath = '') {
        for (const [sourceName, sourcePath] of Object.entries(sources)) {
            const fullSourcePath = path.resolve(parentRoot, sourcePath);
            const sourceContext = parentPath ? `${parentPath}.${sourceName}` : sourceName;
            
            console.log(`Checking source files for: ${sourceContext}`);
            
            // Check this source's contract files
            await this.checkProjectFiles(fullSourcePath, sourceContext, issueReporter);
            
            // Load this source's manifest to check its nested sources
            try {
                const sourceManifestPath = path.join(fullSourcePath, 'contract.json');
                if (fs.existsSync(sourceManifestPath)) {
                    const sourceManifest = JSON.parse(fs.readFileSync(sourceManifestPath, 'utf8'));
                    
                    // Recursively check nested sources
                    if (sourceManifest.sources) {
                        await this.checkSourceFilesRecursive(
                            sourceManifest.sources, 
                            fullSourcePath, 
                            issueReporter, 
                            sourceContext
                        );
                    }
                }
            } catch (error) {
                issueReporter.addIssue({
                    type: 'file-organization',
                    severity: 'error',
                    source: sourceContext,
                    message: `Failed to load source manifest: ${error.message}`,
                    suggestion: 'Check that the source has valid contract files'
                });
            }
        }
    }
    
    async checkCommandsJson(projectRoot, sourcePath, issueReporter) {
        const filePath = path.join(projectRoot, 'commands.json');
        if (!fs.existsSync(filePath)) {
            if (sourcePath === 'root') {
                issueReporter.addIssue({
                    type: 'file-organization',
                    severity: 'error',
                    source: sourcePath,
                    message: 'commands.json file missing',
                    suggestion: 'Create commands.json to define your commands and parameters'
                });
            }
            return;
        }
        
        try {
            const commands = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            
            // Check for properties that belong in other files
            this.checkForHelpProperties(commands, 'commands.json', sourcePath, issueReporter, filePath);
            this.checkForRuntimeProperties(commands, 'commands.json', sourcePath, issueReporter, filePath);
            
        } catch (error) {
            issueReporter.addIssue({
                type: 'file-organization',
                severity: 'error',
                source: sourcePath,
                message: `Failed to parse commands.json: ${error.message}`,
                suggestion: 'Ensure commands.json is valid JSON'
            });
        }
    }
    
    async checkRuntimeJson(projectRoot, sourcePath, issueReporter) {
        const filePath = path.join(projectRoot, 'runtime.json');
        if (!fs.existsSync(filePath)) {
            return;
        }
        
        try {
            const runtime = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            
            // Check for properties that belong in other files
            this.checkForHelpProperties(runtime, 'runtime.json', sourcePath, issueReporter, filePath);
            this.checkForDefinitionProperties(runtime, 'runtime.json', sourcePath, issueReporter, filePath);
            
        } catch (error) {
            issueReporter.addIssue({
                type: 'file-organization',
                severity: 'error',
                source: sourcePath,
                message: `Failed to parse runtime.json: ${error.message}`,
                suggestion: 'Ensure runtime.json is valid JSON'
            });
        }
    }
    
    async checkHelpJson(projectRoot, sourcePath, issueReporter) {
        const filePath = path.join(projectRoot, 'help.json');
        if (!fs.existsSync(filePath)) {
            if (sourcePath === 'root') {
                issueReporter.addIssue({
                    type: 'file-organization',
                    severity: 'info',
                    source: sourcePath,
                    message: 'No help.json file found',
                    suggestion: 'Consider creating help.json for command documentation and examples'
                });
            }
            return;
        }
        
        try {
            const help = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            
            // Check for properties that belong in other files
            this.checkForDefinitionProperties(help, 'help.json', sourcePath, issueReporter, filePath);
            this.checkForRuntimeProperties(help, 'help.json', sourcePath, issueReporter, filePath);
            
        } catch (error) {
            issueReporter.addIssue({
                type: 'file-organization',
                severity: 'error',
                source: sourcePath,
                message: `Failed to parse help.json: ${error.message}`,
                suggestion: 'Ensure help.json is valid JSON'
            });
        }
    }
    
    async checkContractJson(projectRoot, sourcePath, issueReporter) {
        const filePath = path.join(projectRoot, 'contract.json');
        if (!fs.existsSync(filePath)) {
            if (sourcePath === 'root') {
                issueReporter.addIssue({
                    type: 'file-organization',
                    severity: 'error',
                    source: sourcePath,
                    message: 'contract.json file missing',
                    suggestion: 'Create contract.json with app metadata and sources'
                });
            }
            return;
        }
        
        try {
            const contract = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            
            if (contract.commands) {
                if (this.fixMode) {
                    await this.fixCommandsInContract(contract, filePath, sourcePath, issueReporter);
                } else {
                    issueReporter.addIssue({
                        type: 'file-organization',
                        severity: 'warning',
                        source: sourcePath,
                        message: 'Commands found in contract.json',
                        suggestion: 'Move command definitions to commands.json, keep contract.json for app metadata and sources'
                    });
                }
            }
            
            // Check for properties that belong in other files
            this.checkForRuntimeProperties(contract, 'contract.json', sourcePath, issueReporter, filePath);
            this.checkForHelpProperties(contract, 'contract.json', sourcePath, issueReporter, filePath);
            
        } catch (error) {
            issueReporter.addIssue({
                type: 'file-organization',
                severity: 'error',
                source: sourcePath,
                message: `Failed to parse contract.json: ${error.message}`,
                suggestion: 'Ensure contract.json is valid JSON'
            });
        }
    }
    
    checkForHelpProperties(fileData, fileName, sourcePath, issueReporter, filePath) {
        const helpProperties = ['description', 'examples', 'notes', 'syntax'];
        
        for (const [commandName, commandData] of Object.entries(fileData)) {
            // Check command-level help properties
            const foundHelpProps = helpProperties.filter(prop => 
                commandData[prop] !== undefined
            );
            
            if (foundHelpProps.length > 0 && fileName !== 'help.json') {
                if (this.fixMode) {
                    this.fixHelpProperties(commandName, foundHelpProps, fileData, fileName, filePath, sourcePath, issueReporter);
                } else {
                    issueReporter.addIssue({
                        type: 'file-organization',
                        severity: 'warning',
                        source: sourcePath,
                        command: commandName,
                        message: `Help properties found in ${fileName}: ${foundHelpProps.join(', ')}`,
                        suggestion: `Move help properties to help.json, keep ${fileName} for ${this.getFilePurpose(fileName)}`
                    });
                }
            }
            
            // Check parameter-level help properties
            if (commandData.parameters) {
                for (const [paramName, paramSpec] of Object.entries(commandData.parameters)) {
                    const paramHelpProps = helpProperties.filter(prop => 
                        paramSpec[prop] !== undefined
                    );
                    
                    if (paramHelpProps.length > 0 && fileName !== 'help.json') {
                        if (this.fixMode) {
                            this.fixParameterHelpProperties(commandName, paramName, paramHelpProps, commandData, fileName, filePath, sourcePath, issueReporter, fileData);
                        } else {
                            issueReporter.addIssue({
                                type: 'file-organization',
                                severity: 'warning',
                                source: sourcePath,
                                command: commandName,
                                message: `Parameter help properties found in ${fileName}: ${paramName}.${paramHelpProps.join(', ')}`,
                                suggestion: `Move parameter help properties to help.json, keep ${fileName} for ${this.getFilePurpose(fileName)}`
                            });
                        }
                    }
                }
            }
        }
    }
    
    checkForRuntimeProperties(fileData, fileName, sourcePath, issueReporter, filePath) {
        const runtimeProperties = ['sideEffects', 'successOutput', 'errorOutput', 'runtimeFallback', 'transform'];
        
        for (const [commandName, commandData] of Object.entries(fileData)) {
            // Check command-level runtime properties
            const foundRuntimeProps = runtimeProperties.filter(prop => 
                commandData[prop] !== undefined
            );
            
            if (foundRuntimeProps.length > 0 && fileName !== 'runtime.json') {
                if (this.fixMode) {
                    this.fixRuntimeProperties(commandName, foundRuntimeProps, fileData, fileName, filePath, sourcePath, issueReporter);
                } else {
                    issueReporter.addIssue({
                        type: 'file-organization',
                        severity: 'warning',
                        source: sourcePath,
                        command: commandName,
                        message: `Runtime properties found in ${fileName}: ${foundRuntimeProps.join(', ')}`,
                        suggestion: `Move runtime properties to runtime.json, keep ${fileName} for ${this.getFilePurpose(fileName)}`
                    });
                }
            }
            
            // Check parameter-level runtime properties
            if (commandData.parameters) {
                for (const [paramName, paramSpec] of Object.entries(commandData.parameters)) {
                    const paramRuntimeProps = runtimeProperties.filter(prop => 
                        paramSpec[prop] !== undefined
                    );
                    
                    if (paramRuntimeProps.length > 0 && fileName !== 'runtime.json') {
                        if (this.fixMode) {
                            this.fixParameterRuntimeProperties(commandName, paramName, paramRuntimeProps, commandData, fileName, filePath, sourcePath, issueReporter);
                        } else {
                            issueReporter.addIssue({
                                type: 'file-organization',
                                severity: 'warning',
                                source: sourcePath,
                                command: commandName,
                                message: `Parameter runtime properties found in ${fileName}: ${paramName}.${paramRuntimeProps.join(', ')}`,
                                suggestion: `Move parameter runtime properties to runtime.json, keep ${fileName} for ${this.getFilePurpose(fileName)}`
                            });
                        }
                    }
                }
            }
        }
    }
    
    checkForDefinitionProperties(fileData, fileName, sourcePath, issueReporter, filePath) {
        const definitionProperties = ['type', 'required', 'default', 'enum', 'min', 'max'];
        
        if (fileName === 'help.json') {
            for (const [commandName, commandData] of Object.entries(fileData)) {
                if (commandData.parameters) {
                    for (const [paramName, paramSpec] of Object.entries(commandData.parameters)) {
                        const paramDefinitionProps = definitionProperties.filter(prop => 
                            paramSpec[prop] !== undefined
                        );
                        
                        if (paramDefinitionProps.length > 0) {
                            if (this.fixMode) {
                                this.fixDefinitionProperties(commandName, paramName, paramDefinitionProps, commandData, filePath, sourcePath, issueReporter);
                            } else {
                                issueReporter.addIssue({
                                    type: 'file-organization',
                                    severity: 'warning',
                                    source: sourcePath,
                                    command: commandName,
                                    message: `Parameter definition properties found in help.json: ${paramName}.${paramDefinitionProps.join(', ')}`,
                                    suggestion: 'Move parameter definition properties to commands.json, keep help.json for documentation only'
                                });
                            }
                        }
                    }
                }
            }
        }
    }
    
    // Auto-fix implementation methods
    async fixHelpProperties(commandName, helpProps, fileData, fileName, filePath, sourcePath, issueReporter) {
        console.log(`🛠️ Fixing help properties for ${commandName} in ${sourcePath}`);
        
        try {
            const helpFilePath = path.join(path.dirname(filePath), 'help.json');
            let helpData = {};
            if (fs.existsSync(helpFilePath)) {
                helpData = JSON.parse(fs.readFileSync(helpFilePath, 'utf8'));
            }
            
            if (!helpData[commandName]) {
                helpData[commandName] = {};
            }
            
            helpProps.forEach(prop => {
                helpData[commandName][prop] = fileData[commandName][prop];
                delete fileData[commandName][prop];
            });
            
            fs.writeFileSync(filePath, JSON.stringify(fileData, null, 2), 'utf8');
            fs.writeFileSync(helpFilePath, JSON.stringify(helpData, null, 2), 'utf8');
            
            issueReporter.addIssue({
                type: 'file-organization',
                severity: 'info',
                source: sourcePath,
                command: commandName,
                message: `Auto-fixed: Moved help properties to help.json: ${helpProps.join(', ')}`
            });
            
        } catch (error) {
            issueReporter.addIssue({
                type: 'file-organization',
                severity: 'error',
                source: sourcePath,
                command: commandName,
                message: `Failed to auto-fix help properties: ${error.message}`,
                suggestion: 'Manual fix required'
            });
        }
    }
    
    async fixParameterHelpProperties(commandName, paramName, helpProps, commandData, fileName, filePath, sourcePath, issueReporter, fileData) {
        console.log(`🛠️ Fixing parameter help properties for ${commandName}.${paramName} in ${sourcePath}`);
        
        try {
            const helpFilePath = path.join(path.dirname(filePath), 'help.json');
            let helpData = {};
            if (fs.existsSync(helpFilePath)) {
                helpData = JSON.parse(fs.readFileSync(helpFilePath, 'utf8'));
            }
            
            if (!helpData[commandName]) {
                helpData[commandName] = {};
            }
            if (!helpData[commandName].parameters) {
                helpData[commandName].parameters = {};
            }
            if (!helpData[commandName].parameters[paramName]) {
                helpData[commandName].parameters[paramName] = {};
            }
            
            const paramSpec = commandData.parameters[paramName];
            helpProps.forEach(prop => {
                helpData[commandName].parameters[paramName][prop] = paramSpec[prop];
                delete paramSpec[prop];
            });
            
            if (Object.keys(paramSpec).length === 0) {
                delete commandData.parameters[paramName];
            }
            if (Object.keys(commandData.parameters).length === 0) {
                delete commandData.parameters;
            }
            
            fs.writeFileSync(filePath, JSON.stringify(fileData, null, 2), 'utf8');
            fs.writeFileSync(helpFilePath, JSON.stringify(helpData, null, 2), 'utf8');
            
            issueReporter.addIssue({
                type: 'file-organization',
                severity: 'info',
                source: sourcePath,
                command: commandName,
                message: `Auto-fixed: Moved parameter help properties to help.json: ${paramName}.${helpProps.join(', ')}`
            });
            
        } catch (error) {
            issueReporter.addIssue({
                type: 'file-organization',
                severity: 'error',
                source: sourcePath,
                command: commandName,
                message: `Failed to auto-fix parameter help properties: ${error.message}`,
                suggestion: 'Manual fix required'
            });
        }
    }
    
    async fixRuntimeProperties(commandName, runtimeProps, fileData, fileName, filePath, sourcePath, issueReporter) {
        console.log(`🛠️ Fixing runtime properties for ${commandName} in ${sourcePath}`);
        
        try {
            const runtimeFilePath = path.join(path.dirname(filePath), 'runtime.json');
            let runtimeData = {};
            if (fs.existsSync(runtimeFilePath)) {
                runtimeData = JSON.parse(fs.readFileSync(runtimeFilePath, 'utf8'));
            }
            
            if (!runtimeData[commandName]) {
                runtimeData[commandName] = {};
            }
            
            runtimeProps.forEach(prop => {
                runtimeData[commandName][prop] = fileData[commandName][prop];
                delete fileData[commandName][prop];
            });
            
            fs.writeFileSync(filePath, JSON.stringify(fileData, null, 2), 'utf8');
            fs.writeFileSync(runtimeFilePath, JSON.stringify(runtimeData, null, 2), 'utf8');
            
            issueReporter.addIssue({
                type: 'file-organization',
                severity: 'info',
                source: sourcePath,
                command: commandName,
                message: `Auto-fixed: Moved runtime properties to runtime.json: ${runtimeProps.join(', ')}`
            });
            
        } catch (error) {
            issueReporter.addIssue({
                type: 'file-organization',
                severity: 'error',
                source: sourcePath,
                command: commandName,
                message: `Failed to auto-fix runtime properties: ${error.message}`,
                suggestion: 'Manual fix required'
            });
        }
    }
    
    async fixParameterRuntimeProperties(commandName, paramName, runtimeProps, commandData, fileName, filePath, sourcePath, issueReporter) {
        console.log(`🛠️ Fixing parameter runtime properties for ${commandName}.${paramName} in ${sourcePath}`);
        
        try {
            const runtimeFilePath = path.join(path.dirname(filePath), 'runtime.json');
            let runtimeData = {};
            if (fs.existsSync(runtimeFilePath)) {
                runtimeData = JSON.parse(fs.readFileSync(runtimeFilePath, 'utf8'));
            }
            
            if (!runtimeData[commandName]) {
                runtimeData[commandName] = {};
            }
            if (!runtimeData[commandName].parameters) {
                runtimeData[commandName].parameters = {};
            }
            if (!runtimeData[commandName].parameters[paramName]) {
                runtimeData[commandName].parameters[paramName] = {};
            }
            
            const paramSpec = commandData.parameters[paramName];
            runtimeProps.forEach(prop => {
                runtimeData[commandName].parameters[paramName][prop] = paramSpec[prop];
                delete paramSpec[prop];
            });
            
            if (Object.keys(paramSpec).length === 0) {
                delete commandData.parameters[paramName];
            }
            if (Object.keys(commandData.parameters).length === 0) {
                delete commandData.parameters;
            }
            
            fs.writeFileSync(filePath, JSON.stringify(fileData, null, 2), 'utf8');
            fs.writeFileSync(runtimeFilePath, JSON.stringify(runtimeData, null, 2), 'utf8');
            
            issueReporter.addIssue({
                type: 'file-organization',
                severity: 'info',
                source: sourcePath,
                command: commandName,
                message: `Auto-fixed: Moved parameter runtime properties to runtime.json: ${paramName}.${runtimeProps.join(', ')}`
            });
            
        } catch (error) {
            issueReporter.addIssue({
                type: 'file-organization',
                severity: 'error',
                source: sourcePath,
                command: commandName,
                message: `Failed to auto-fix parameter runtime properties: ${error.message}`,
                suggestion: 'Manual fix required'
            });
        }
    }
    
    async fixDefinitionProperties(commandName, paramName, definitionProps, commandData, filePath, sourcePath, issueReporter) {
        console.log(`🛠️ Fixing definition properties for ${commandName}.${paramName} in ${sourcePath}`);
        
        try {
            const commandsFilePath = path.join(path.dirname(filePath), 'commands.json');
            let commandsData = {};
            if (fs.existsSync(commandsFilePath)) {
                commandsData = JSON.parse(fs.readFileSync(commandsFilePath, 'utf8'));
            }
            
            if (!commandsData[commandName]) {
                commandsData[commandName] = {};
            }
            if (!commandsData[commandName].parameters) {
                commandsData[commandName].parameters = {};
            }
            if (!commandsData[commandName].parameters[paramName]) {
                commandsData[commandName].parameters[paramName] = {};
            }
            
            const paramSpec = commandData.parameters[paramName];
            definitionProps.forEach(prop => {
                commandsData[commandName].parameters[paramName][prop] = paramSpec[prop];
                delete paramSpec[prop];
            });
            
            if (Object.keys(paramSpec).length === 0) {
                delete commandData.parameters[paramName];
            }
            if (Object.keys(commandData.parameters).length === 0) {
                delete commandData.parameters;
            }
            
            fs.writeFileSync(filePath, JSON.stringify(fileData, null, 2), 'utf8');
            fs.writeFileSync(commandsFilePath, JSON.stringify(commandsData, null, 2), 'utf8');
            
            issueReporter.addIssue({
                type: 'file-organization',
                severity: 'info',
                source: sourcePath,
                command: commandName,
                message: `Auto-fixed: Moved parameter definition properties to commands.json: ${paramName}.${definitionProps.join(', ')}`
            });
            
        } catch (error) {
            issueReporter.addIssue({
                type: 'file-organization',
                severity: 'error',
                source: sourcePath,
                command: commandName,
                message: `Failed to auto-fix definition properties: ${error.message}`,
                suggestion: 'Manual fix required'
            });
        }
    }
    
    async fixCommandsInContract(contract, filePath, sourcePath, issueReporter) {
        console.log(`🛠️ Fixing commands in contract.json for ${sourcePath}`);
        
        try {
            const commandsFilePath = path.join(path.dirname(filePath), 'commands.json');
            let commandsData = {};
            if (fs.existsSync(commandsFilePath)) {
                commandsData = JSON.parse(fs.readFileSync(commandsFilePath, 'utf8'));
            }
            
            // Move commands from contract.json to commands.json
            Object.assign(commandsData, contract.commands);
            delete contract.commands;
            
            fs.writeFileSync(filePath, JSON.stringify(contract, null, 2), 'utf8');
            fs.writeFileSync(commandsFilePath, JSON.stringify(commandsData, null, 2), 'utf8');
            
            issueReporter.addIssue({
                type: 'file-organization',
                severity: 'info',
                source: sourcePath,
                message: `Auto-fixed: Moved commands from contract.json to commands.json`
            });
            
        } catch (error) {
            issueReporter.addIssue({
                type: 'file-organization',
                severity: 'error',
                source: sourcePath,
                message: `Failed to auto-fix commands in contract.json: ${error.message}`,
                suggestion: 'Manual fix required'
            });
        }
    }
    
    getFilePurpose(fileName) {
        const purposes = {
            'commands.json': 'command and parameter definitions',
            'runtime.json': 'runtime behavior and parameter overrides', 
            'help.json': 'documentation, examples, and syntax help',
            'contract.json': 'app metadata and sources'
        };
        return purposes[fileName] || 'its intended purpose';
    }

    async checkParameterConsistency(projectRoot, sourcePath, issueReporter) {
        // Load all three files to check consistency
        const commandsPath = path.join(projectRoot, 'commands.json');
        const runtimePath = path.join(projectRoot, 'runtime.json');
        const helpPath = path.join(projectRoot, 'help.json');
        
        let commandsData = {};
        let runtimeData = {};
        let helpData = {};
        
        try {
            if (fs.existsSync(commandsPath)) {
                commandsData = JSON.parse(fs.readFileSync(commandsPath, 'utf8'));
            }
            if (fs.existsSync(runtimePath)) {
                runtimeData = JSON.parse(fs.readFileSync(runtimePath, 'utf8'));
            }
            if (fs.existsSync(helpPath)) {
                helpData = JSON.parse(fs.readFileSync(helpPath, 'utf8'));
            }
        } catch (error) {
            // File parsing errors already handled in individual check methods
            return;
        }
        
        // Get all command names from commands.json
        const commandsJsonCommands = Object.keys(commandsData);
        
        // Check for orphaned commands (in runtime/help but not in commands)
        this.checkOrphanedCommands(commandsJsonCommands, runtimeData, 'runtime.json', sourcePath, issueReporter);
        this.checkOrphanedCommands(commandsJsonCommands, helpData, 'help.json', sourcePath, issueReporter);
        
        // Check parameter consistency for each command
        for (const commandName of commandsJsonCommands) {
            const commandsParams = commandsData[commandName]?.parameters ? 
                Object.keys(commandsData[commandName].parameters) : [];
            
            // Check runtime.json parameters
            if (runtimeData[commandName]?.parameters) {
                this.checkOrphanedParameters(
                    commandsParams, 
                    runtimeData[commandName].parameters, 
                    commandName, 
                    'runtime.json', 
                    sourcePath, 
                    issueReporter
                );
            }
            
            // Check help.json parameters
            if (helpData[commandName]?.parameters) {
                this.checkOrphanedParameters(
                    commandsParams, 
                    helpData[commandName].parameters, 
                    commandName, 
                    'help.json', 
                    sourcePath, 
                    issueReporter
                );
                
                // Check for missing parameter descriptions (info level)
                this.checkMissingDescriptions(
                    commandsData[commandName]?.parameters,
                    helpData[commandName].parameters,
                    commandName,
                    sourcePath,
                    issueReporter
                );
            } else if (commandsParams.length > 0) {
                // No help.json for this command, but it has parameters
                issueReporter.addIssue({
                    type: 'parameter-consistency',
                    severity: 'info',
                    source: sourcePath,
                    command: commandName,
                    message: `Command has ${commandsParams.length} parameters but no help.json entry`,
                    suggestion: 'Consider adding parameter descriptions to help.json'
                });
            }
        }
    }

    checkOrphanedCommands(commandsJsonCommands, otherFileData, fileName, sourcePath, issueReporter) {
        const otherFileCommands = Object.keys(otherFileData);
        const orphanedCommands = otherFileCommands.filter(cmd => !commandsJsonCommands.includes(cmd));
        
        if (orphanedCommands.length > 0) {
            orphanedCommands.forEach(commandName => {
                issueReporter.addIssue({
                    type: 'parameter-consistency',
                    severity: 'warning',
                    source: sourcePath,
                    command: commandName,
                    message: `Command found in ${fileName} but not in commands.json`,
                    suggestion: `Remove from ${fileName} or add to commands.json`
                });
            });
        }
    }

    checkOrphanedParameters(commandsParams, otherFileParams, commandName, fileName, sourcePath, issueReporter) {
        const otherFileParamNames = Object.keys(otherFileParams);
        const orphanedParams = otherFileParamNames.filter(param => !commandsParams.includes(param));
        
        if (orphanedParams.length > 0) {
            issueReporter.addIssue({
                type: 'parameter-consistency',
                severity: 'warning',
                source: sourcePath,
                command: commandName,
                message: `Parameters in ${fileName} but not in commands.json: ${orphanedParams.join(', ')}`,
                suggestion: `Remove from ${fileName} or add to commands.json`
            });
        }
    }

    checkMissingDescriptions(commandsParams, helpParams, commandName, sourcePath, issueReporter) {
        if (!commandsParams) return;
        
        const commandsParamNames = Object.keys(commandsParams);
        const helpParamNames = Object.keys(helpParams);
        
        // Find parameters that exist in commands but not in help
        const missingInHelp = commandsParamNames.filter(param => !helpParamNames.includes(param));
        
        if (missingInHelp.length > 0) {
            issueReporter.addIssue({
                type: 'parameter-consistency',
                severity: 'info',
                source: sourcePath,
                command: commandName,
                message: `Parameters missing from help.json: ${missingInHelp.join(', ')}`,
                suggestion: 'Consider adding descriptions for these parameters in help.json'
            });
        }
        
        // Find parameters in help that don't have descriptions
        const paramsWithoutDescriptions = helpParamNames.filter(param => 
            !helpParams[param].description || helpParams[param].description.trim() === ''
        );
        
        if (paramsWithoutDescriptions.length > 0) {
            issueReporter.addIssue({
                type: 'parameter-consistency',
                severity: 'info',
                source: sourcePath,
                command: commandName,
                message: `Parameters in help.json missing descriptions: ${paramsWithoutDescriptions.join(', ')}`,
                suggestion: 'Add description fields for these parameters in help.json'
            });
        }
    }
}

export default FileOrgScanner;