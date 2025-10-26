// Constants - pure data, no state
const PATTERNS = {
  objectCall: /^(\w+)\s*\(\s*(\{.*\})\s*\)\s*$/,
  funcCall: /^(\w+)\s*\(\s*([^)]*)\s*\)\s*$/,
  simpleCommand: /^(\w+)\s*$/,
  cliStyle: /^(\w+)\s+(.+)$/,
};

export class Parser {
  static properties = []; // Global processor
  
  /**
   * INLINED from the old Parser class
   */
  static parseFunctionStyle([, name, argsString], commandSpec) {
    const parameters = commandSpec?.parameters || {};
    const paramNames = Object.keys(parameters);

    let args = {};
    const argPairs = argsString
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    let positionalIndex = 0;

    for (const argPair of argPairs) {
      if (argPair.includes('=')) {
        // Named parameter: key=value
        const [key, valueStr] = argPair.split('=', 2).map((s) => s.trim());
        args[key] = valueStr;
      } else {
        // Positional parameter
        if (positionalIndex < paramNames.length) {
          const paramName = paramNames[positionalIndex];
          args[paramName] = argPair;
          positionalIndex++;
        } else {
          throw new Error(`Too many positional arguments`);
        }
      }
    }
    return { name, args };
  }

  static parseObjectStyle([, name, argsString]) {
    let args;
    try {
      args = JSON.parse(argsString);
    } catch (e) {
      try {
        const wrappedArgsString = argsString.replace(
          /([{,]\s*)([a-zA-Z_$][\w$]*)(\s*:)/g,
          '$1"$2"$3',
        );
        args = JSON.parse(wrappedArgsString);
      } catch (fallbackError) {
        throw new Error(`Invalid object syntax: ${argsString}`);
      }
    }

    if (typeof args !== 'object' || args === null) {
      throw new Error(`Expected object for ${name}`);
    }

    return { name, args };
  }

  static parseCliStyle(command, argsString, commandSpec) {
    if (!commandSpec) throw new Error(`Unknown command: ${command}`);

    const required = Object.entries(commandSpec.parameters || {})
      .filter(([_, p]) => p.required)
      .map(([name, param]) => ({ name, ...param }));
    const parts = argsString.split(/\s+/).filter(Boolean);

    const positional = [];
    const named = [];

    for (const part of parts) {
      if (part.includes('=')) {
        named.push(part);
      } else {
        positional.push(part);
      }
    }

    if (positional.length > required.length) {
      throw new Error(`Too many positional parameters for ${command}`);
    }

    const positionalPairs = required
      .slice(0, positional.length)
      .map((p, i) => `${p.name}=${positional[i]}`);

    const funcCall = `${command}(${[...positionalPairs, ...named].join(',')})`;
    const match = funcCall.match(PATTERNS.funcCall);

    return this.parseFunctionStyle(match, commandSpec);
  }

  static extractCommandName(input) {
    if (!input || typeof input !== 'string') {
      throw new Error('Invalid input: must be a non-empty string');
    }

    const trimmed = input.trim();
    const simpleMatch = trimmed.match(PATTERNS.simpleCommand);
    if (simpleMatch) return simpleMatch[1];

    const funcMatch = trimmed.match(PATTERNS.funcCall);
    if (funcMatch) return funcMatch[1];

    const objectMatch = trimmed.match(PATTERNS.objectCall);
    if (objectMatch) return objectMatch[1];

    const cliMatch = trimmed.match(PATTERNS.cliStyle);
    if (cliMatch) return cliMatch[1];

    throw new Error(`Could not extract command name from: ${input}`);
  }

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

  static processString(input, manifest) {
    try {
      // First try JSON parsing
      const parsed = JSON.parse(input);
      return this.validateCommandObject(parsed);
    } catch {
      // Fall back to command parser
      const commandName = this.extractCommandName(input);
      const commandSpec = manifest.commands[commandName];
      if (!commandSpec) {
        throw new Error(`Processor error: Unknown command: ${commandName}`);
      }
      return this.parseCommand(input, commandSpec);
    }
  }

  static parseCommand(input, commandSpec) {
    if (!input || typeof input !== 'string') {
      throw new Error('Invalid input: must be a non-empty string');
    }

    const trimmed = input.trim();

    // First, try to parse as JSON command object
    try {
      const commandObj = JSON.parse(trimmed);
      if (commandObj && typeof commandObj === 'object' && commandObj.name) {
        return commandObj;
      }
    } catch (jsonError) {
      // Not a JSON command object, continue with string parsing
    }

    // Try CLI-style parsing first
    const cliMatch = trimmed.match(PATTERNS.cliStyle);
    if (cliMatch) {
      if (commandSpec.parameters || Object.entries(commandSpec.parameters).every(([_, p]) => !p.required)) {
        return this.parseCliStyle(cliMatch[1], cliMatch[2], commandSpec);
      }
    }

    // Try object style
    const objectMatch = trimmed.match(PATTERNS.objectCall);
    if (objectMatch) {
      return this.parseObjectStyle(objectMatch);
    }

    // Try function style
    const funcMatch = trimmed.match(PATTERNS.funcCall);
    if (funcMatch) {
      return this.parseFunctionStyle(funcMatch, commandSpec);
    }

    // Try simple command
    const simpleMatch = trimmed.match(PATTERNS.simpleCommand);
    if (simpleMatch) {
      const funcCall = `${trimmed}()`;
      const match = funcCall.match(PATTERNS.funcCall);
      if (match) return this.parseFunctionStyle(match, commandSpec);
    }

    throw new Error(`Could not parse command: ${input}`);
  }

  static validateCommandObject(commandObj) {
    if (commandObj.name) {
      return commandObj;
    } else {
      throw new Error('Processor error: Missing command name');
    }
  }

  static getSpec(processedInput, manifest, target = false) {
    const commandPath = processedInput.name;
    
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
   * Processor interface
   */
  async preProcess(context) {
    const { input, manifest } = context;
    
    const processedInput = this.constructor.processInput(input, manifest);
    const commandSpec = this.constructor.getSpec(processedInput, manifest);
    
    return {
      ...context,
      command: { 
        name: processedInput.name, 
        args: processedInput.args 
      },
      commandSpec
    };
  }
}