import fs from 'fs';
import path from 'path';

export class PackageScanner {
    name = 'PackageScanner';
    
    async scan(manifest, projectRoot, issueReporter) {
        console.log(`PackageScanner scanning with ${manifest.commands?.length || 0} commands`);
        
        // Skip if no commands (might be a source-only project)
        if (!manifest.commands || manifest.commands.length === 0) {
            issueReporter.addIssue({
                type: 'package',
                severity: 'info',
                message: 'No commands found - skipping package.json validation'
            });
            return;
        }
        
        // Check project root package.json
        await this.validateProjectPackageJson(manifest, projectRoot, issueReporter);
        
        // Check source directories for package.json alignment
        await this.validateSourcePackageJsons(manifest, projectRoot, issueReporter);
        
        // Check for native methods without sources (suggest package.json)
        this.checkNativeMethodsWithoutSources(manifest, projectRoot, issueReporter);
    }
    
    async validateProjectPackageJson(manifest, projectRoot, issueReporter) {
        const packageJsonPath = path.join(projectRoot, 'package.json');
        
        if (!fs.existsSync(packageJsonPath)) {
            // Only suggest package.json if we have native methods in project root
            const hasRootNativeMethods = manifest.commands.some(cmd => 
                cmd.commandType === 'native-method' && (!cmd.source || cmd.source === './')
            );
            
            if (hasRootNativeMethods) {
                issueReporter.addIssue({
                    type: 'package',
                    severity: 'info',
                    message: 'No package.json in project root',
                    suggestion: 'Consider creating package.json for better project management'
                });
            }
            return;
        }
        
        try {
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            
            // Check name alignment (only if both exist)
            if (packageJson.name && manifest.name && packageJson.name !== manifest.name) {
                issueReporter.addIssue({
                    type: 'package',
                    severity: 'warning',
                    message: `Package name mismatch: package.json has "${packageJson.name}", contract has "${manifest.name}"`,
                    suggestion: 'Consider aligning package.json name with contract name for consistency'
                });
            }
            
            // Check if package.json has relevant scripts or dependencies
            this.checkPackageJsonRelevance(packageJson, projectRoot, issueReporter);
            
        } catch (error) {
            issueReporter.addIssue({
                type: 'package',
                severity: 'error',
                message: `Failed to parse package.json: ${error.message}`,
                suggestion: 'Ensure package.json is valid JSON'
            });
        }
    }
    
    async validateSourcePackageJsons(manifest, projectRoot, issueReporter) {
        // Check if manifest has sources
        if (!manifest.sources) {
            console.log('No sources found in manifest');
            return;
        }
        
        console.log(`Validating ${Object.keys(manifest.sources).length} sources`);
        
        for (const [sourceName, sourcePath] of Object.entries(manifest.sources)) {
            console.log(`Validating package.json for source '${sourceName}'...`);
            await this.validateSourcePackageJson(sourceName, sourcePath, projectRoot, issueReporter, manifest);
        }
    }
    
    async validateSourcePackageJson(sourceName, sourcePath, projectRoot, issueReporter, manifest) {
        const resolvedSourcePath = path.resolve(projectRoot, sourcePath);
        
        // Check if source directory exists
        if (!fs.existsSync(resolvedSourcePath)) {
            issueReporter.addIssue({
                type: 'package',
                severity: 'warning',
                message: `Source directory not found: ${sourcePath}`,
                suggestion: `Check that source path '${sourcePath}' exists for source '${sourceName}'`
            });
            return;
        }
        
        // Check if it's a directory
        if (!fs.statSync(resolvedSourcePath).isDirectory()) {
            issueReporter.addIssue({
                type: 'package',
                severity: 'warning',
                message: `Source path is not a directory: ${sourcePath}`,
                suggestion: `Source '${sourceName}' should point to a directory, not a file`
            });
            return;
        }
        
        const sourcePackageJsonPath = path.join(resolvedSourcePath, 'package.json');
        
        // Check for package.json in source directory
        if (!fs.existsSync(sourcePackageJsonPath)) {
            // Check if this source has any native methods
            const hasNativeMethods = manifest.commands.some(cmd => 
                cmd.commandType === 'native-method' && cmd.source === sourcePath
            );
            
            if (hasNativeMethods) {
                issueReporter.addIssue({
                    type: 'package',
                    severity: 'info',
                    message: `Source '${sourceName}' has native methods but no package.json`,
                    suggestion: `Consider adding package.json to ${sourcePath} for better dependency management`
                });
            }
            return;
        }
        
        try {
            const sourcePackageJson = JSON.parse(fs.readFileSync(sourcePackageJsonPath, 'utf8'));
            
            // Validate source package.json has reasonable content
            if (!sourcePackageJson.name) {
                issueReporter.addIssue({
                    type: 'package',
                    severity: 'warning',
                    message: `Source '${sourceName}' package.json missing name`,
                    suggestion: `Add name field to ${sourcePath}/package.json`
                });
            }
            
            // Check if source name matches package.json name
            if (sourcePackageJson.name && sourcePackageJson.name !== sourceName) {
                issueReporter.addIssue({
                    type: 'package',
                    severity: 'info',
                    message: `Source name '${sourceName}' differs from package.json name '${sourcePackageJson.name}'`,
                    suggestion: `Consider aligning source name with package.json name for clarity`
                });
            }
            
        } catch (error) {
            issueReporter.addIssue({
                type: 'package',
                severity: 'error',
                message: `Failed to parse package.json in source '${sourceName}': ${error.message}`,
                suggestion: `Ensure ${sourcePath}/package.json is valid JSON`
            });
        }
    }
    
    checkNativeMethodsWithoutSources(manifest, projectRoot, issueReporter) {
        const nativeMethods = manifest.commands.filter(cmd => 
            cmd.commandType === 'native-method'
        );
        
        const methodsWithoutExplicitSource = nativeMethods.filter(cmd => 
            !cmd.source || cmd.source === './'
        );
        
        if (methodsWithoutExplicitSource.length > 0) {
            const methodNames = methodsWithoutExplicitSource.map(cmd => cmd.name).join(', ');
            issueReporter.addIssue({
                type: 'package',
                severity: 'info',
                message: `${methodsWithoutExplicitSource.length} native methods use project root (no explicit source): ${methodNames}`,
                suggestion: 'Consider organizing related methods into source directories with their own package.json files'
            });
        }
    }
    
    checkPackageJsonRelevance(packageJson, projectRoot, issueReporter) {
        const hasRelevantContent = 
            (packageJson.dependencies && Object.keys(packageJson.dependencies).length > 0) ||
            (packageJson.devDependencies && Object.keys(packageJson.devDependencies).length > 0) ||
            (packageJson.scripts && Object.keys(packageJson.scripts).length > 0);
        
        if (!hasRelevantContent) {
            issueReporter.addIssue({
                type: 'package',
                severity: 'info',
                message: 'package.json exists but has no dependencies or scripts',
                suggestion: 'Consider adding relevant dependencies or scripts to package.json'
            });
        }
        
        // Check for common Vertex-related scripts
        if (packageJson.scripts) {
            const hasVertexScripts = Object.keys(packageJson.scripts).some(scriptName =>
                scriptName.includes('vertex') || scriptName.includes('generate') || scriptName.includes('serve')
            );
            
            if (!hasVertexScripts) {
                issueReporter.addIssue({
                    type: 'package',
                    severity: 'info',
                    message: 'No Vertex-related scripts found in package.json',
                    suggestion: 'Consider adding scripts for common Vertex operations (generate, serve, etc.)'
                });
            }
        }
    }
}

export default PackageScanner;