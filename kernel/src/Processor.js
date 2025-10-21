import { Parser } from './Parser.js';

/**
 * Command processing wrapper
 */
export class Processor {
	/**
	 * Parse various input types into a command object using manifest
	 * @param {*} input - Raw input (string, object, or array)
	 * @param {Object} manifest - The manifest for command lookup
	 * @returns {Object} - Normalized command object
	 */
	static processInput(input, manifest) {
		// Handle object input
		if (typeof input === 'object' && input !== null) {
			if (Array.isArray(input)) {
				return this.processArray(input, manifest);
			}
			return this.validateCommandObject(input); // Already a command object
		}

		// Handle string input
		if (typeof input === 'string') {
			return this.processString(input, manifest);
		}

		throw new Error(`Processor error: Unsupported input type: ${typeof input}`);
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

  static processArray(inputArray, manifest) {
    if (!Array.isArray(inputArray) || inputArray.length === 0) {
      throw new Error('Processor error: Command array must be non-empty');
    }

    // Parse each element
    const parsedCommands = inputArray.map((input) => {
      // If input is a file args object (has properties but no name), treat as args fragment
      if (typeof input === 'object' && input !== null && !input.name) {
        return { args: input }; // Wrap in command structure with empty name
      }
      return this.processInput(input, manifest);
    });

    // Merge all commands
    return this.mergeCommandObjects(parsedCommands);
  }

  static mergeCommandObjects(commandObjects) {
    // Find the first command that has a name (the actual command)
    const baseCommand = commandObjects.find((cmd) => cmd.name) || { args: {} };

    // Merge all args from all objects
    const mergedArgs = commandObjects.reduce((args, cmd) => {
      return { ...args, ...(cmd.args || {}) }; // Handle case where cmd.args might be undefined
    }, {});

    // Ensure we have a name from somewhere
    if (!baseCommand.name) {
      throw new Error('Processor error: No command name found in input array');
    }

    return {
      name: baseCommand.name,
      args: mergedArgs,
    };
  }

  static validateCommandObject(commandObj) {
	if (commandObj.name) {
		return commandObj;
	} else {
		throw new Error('Processor error: Missing command name');
	}
  }
}
