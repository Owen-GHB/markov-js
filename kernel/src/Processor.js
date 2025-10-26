import { Parser } from './Parser.js';

/**
 * Command processing wrapper
 */
export class Processor {
    /**
     * Parse various input types into a command object using manifest
     * @param {*} input - Raw input (string or object)
     * @param {Object} manifest - The manifest for command lookup
     * @returns {Object} - Normalized command object
     */
    static processInput(input, manifest) {
        // Handle object input (already parsed command)
        if (typeof input === 'object' && input !== null && !Array.isArray(input)) {
            return this.validateCommandObject(input);
        }

        // Handle string input
        if (typeof input === 'string') {
            return this.processString(input, manifest);
        }

        throw new Error(`Processor error: Unsupported input type: ${typeof input}`);
    }

    static getSpec(command, manifest, target = false) {
        const commandPath = command.name;
        
        // Prevent direct access to namespaced commands
        if (!target && commandPath.includes('/')) {
            throw new Error(`Command not found: ${commandPath}`);
        }
        
        // Direct lookup
        const spec = manifest.commands[commandPath];
        
        if (!spec) {
            throw new Error(`Command not found: ${commandPath}`);
        }
        
        return spec;
    }

    /**
     * Parse string input into command object
     */
    static processString(input, manifest) {
        try {
            // First try JSON parsing
            const parsed = JSON.parse(input);
            return this.validateCommandObject(parsed);
        } catch {
            // Fall back to command parser
            const commandName = Parser.extractCommandName(input);
            const commandSpec = manifest.commands[commandName];
            if (!commandSpec) {
                throw new Error(`Processor error: Unknown command: ${commandName}`);
            }
            return Parser.parseCommand(input, commandSpec);
        }
    }

    static validateCommandObject(commandObj) {
        if (commandObj.name) {
            return commandObj;
        } else {
            throw new Error('Processor error: Missing command name');
        }
    }
}