export class Specifier {
    static specifyCommand(command, manifest, target = false) {
        const commandPath = command.name;
        
        // Prevent direct access to namespaced commands
        if (!target && commandPath.includes('/')) {
            throw new Error(`Command not found: ${commandPath}`);
        }
        
        // Direct lookup - thanks to prequalification!
        const spec = manifest.commands[commandPath];
        
        if (!spec) {
            throw new Error(`Command not found: ${commandPath}`);
        }
        
        return spec;
    }
}