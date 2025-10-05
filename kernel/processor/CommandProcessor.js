import { CommandParser } from './CommandParser.js';
import { CommandHandler } from './CommandHandler.js';
import stateManager from './StateManager.js';
import { manifest } from '../contract.js';

/**
 * Consolidates shared command processing logic across all transports
 */
export class CommandProcessor {
  constructor() {
    this.parser = new CommandParser();
    this.handler = new CommandHandler();
    this.state = stateManager.getStateMap();
  }

  /**
   * Process a command through the complete pipeline
   * @param {string} input - The command input string (can be JSON or string format)
   * @param {Object} additionalContext - Additional context to merge with default context
   * @returns {Promise<Object>} - The result of command processing
   */
  async processCommand(input, additionalContext = {}) {
    try {
      const trimmedInput = input.trim().toLowerCase();
      
      // Handle special built-in commands before parsing
      if (trimmedInput === 'help' || trimmedInput === 'help()' || trimmedInput.startsWith('help(')) {
        // Create a help command object
        let args = {};
        if (trimmedInput.startsWith('help(') && input.includes('(') && input.includes(')')) {
          // Extract any specific command from help(command)
          const paramMatch = input.match(/help\(\s*["']?([^"')\s]+)["']?\s*\)/i);
          if (paramMatch && paramMatch[1]) {
            args = { command: paramMatch[1] };
          }
        }
        
        const context = {
          state: this.state,
          manifest: manifest,
          ...additionalContext
        };
        
        const result = await this.handleHelpCommand(args, context);
        return result;
      }

      if (trimmedInput === 'exit' || trimmedInput === 'exit()') {
        const result = await this.handleExitCommand();
        // Exit command returns a special result for transports to handle
        return { 
          output: 'Goodbye!', 
          exit: true 
        };
      }

      // For all other commands, create context and parse normally
      const context = {
        state: this.state,
        manifest: manifest,
        ...additionalContext
      };

      // Parse the command using the unified parser
      const { error, command } = this.parser.parse(input, context);

      if (error) {
        return { error, output: null };
      }

      // Execute the command through the handler
      const result = await this.handler.handleCommand(command);

      // Apply side effects and save state if command was successful
      if (!result.error) {
        const commandSpec = manifest.commands.find(c => c.name === command.name);
        if (commandSpec) {
          stateManager.applySideEffects(command, commandSpec);
          stateManager.saveState();
        }
      }

      return result;
    } catch (error) {
      return { 
        error: `Command processing error: ${error.message}`, 
        output: null 
      };
    }
  }

  /**
   * Handle the help command logic inline
   * @param {Object} args - Arguments for the help command
   * @param {Object} context - Execution context
   * @returns {Object} - Result of the help command
   */
  async handleHelpCommand(args, context) {
    const { manifest } = context;
    const { command: specificCommand } = args;

    if (specificCommand) {
      // Show help for specific command
      const cmd = manifest.commands.find(c => c.name === specificCommand);
      if (!cmd) {
        return { error: `Unknown command: ${specificCommand}` };
      }
      
      return { output: this.formatCommandHelp(cmd) };
    } else {
      // Show general help
      return { output: this.formatGeneralHelp(manifest) };
    }
  }

  /**
   * Format general help text
   * @param {Object} manifest - The application manifest
   * @returns {string} Formatted help text
   */
  formatGeneralHelp(manifest) {
    let helpText = `🔗 ${manifest.name} - ${manifest.description}\n`;
    helpText += '='.repeat(Math.max(manifest.name.length + 2, 40)) + '\n\n';
    helpText += 'Available commands:\n';
    
    // Sort commands alphabetically
    const sortedCommands = [...manifest.commands].sort((a, b) => 
      a.name.localeCompare(b.name)
    );
    
    for (const cmd of sortedCommands) {
      helpText += `${cmd.name}${this.formatParamsSignature(cmd)} - ${cmd.description}\n`;
    }
    
    helpText += '\nhelp([command]) - Show help information\n';
    helpText += 'exit() - Exit the program\n';
    helpText += '\nCommand Syntax:\n';
    helpText += '• Function style: command(param1, param2, key=value)\n';
    helpText += '• Object style: command({param1: value, key: value})\n';
    helpText += '• Simple style: command\n';
    
    return helpText;
  }

  /**
   * Format help for a specific command
   * @param {Object} cmd - The command manifest
   * @returns {string} Formatted command help
   */
  formatCommandHelp(cmd) {
    let helpText = `🔗 ${cmd.name}${this.formatParamsSignature(cmd)}\n`;
    helpText += '   ' + cmd.description + '\n\n';
    
    const requiredParams = cmd.parameters ? cmd.parameters.filter(p => p.required) : [];
    const optionalParams = cmd.parameters ? cmd.parameters.filter(p => !p.required) : [];
    
    if (requiredParams.length > 0) {
      helpText += '   Required:\n';
      for (const param of requiredParams) {
        helpText += `       ${param.name} - ${param.description}\n`;
      }
      helpText += '\n';
    }
    
    if (optionalParams.length > 0) {
      helpText += '   Options (key=value):\n';
      for (const param of optionalParams) {
        const defaultValue = param.default !== undefined ? ` (default: ${param.default})` : '';
        const constraints = this.formatParamConstraints(param);
        const constraintText = constraints ? ` ${constraints}` : '';
        helpText += `       ${param.name}=${param.type}${defaultValue}${constraintText} - ${param.description}\n`;
      }
      helpText += '\n';
    }
    
    if (cmd.examples && cmd.examples.length > 0) {
      helpText += '   Examples:\n';
      for (const example of cmd.examples) {
        helpText += `       ${example}\n`;
      }
    }
    
    return helpText;
  }

  /**
   * Format parameter signature for a command
   * @param {Object} cmd - The command manifest
   * @returns {string} Formatted parameter signature
   */
  formatParamsSignature(cmd) {
    if (!cmd.parameters || cmd.parameters.length === 0) {
      return '()';
    }
    
    const required = cmd.parameters.filter(p => p.required);
    const optional = cmd.parameters.filter(p => !p.required);
    
    const requiredStr = required.map(p => p.name).join(', ');
    const optionalStr = optional.map(p => `[${p.name}]`).join(', ');
    
    let paramsStr = '';
    if (required.length > 0 && optional.length > 0) {
      paramsStr = `${requiredStr}, ${optionalStr}`;
    } else if (required.length > 0) {
      paramsStr = requiredStr;
    } else if (optional.length > 0) {
      paramsStr = optionalStr;
    }
    
    return `(${paramsStr})`;
  }

  /**
   * Format parameter constraints for display
   * @param {Object} param - The parameter manifest
   * @returns {string} Formatted constraints
   */
  formatParamConstraints(param) {
    const constraints = [];
    
    if (param.min !== undefined) {
      constraints.push(`min: ${param.min}`);
    }
    if (param.max !== undefined) {
      constraints.push(`max: ${param.max}`);
    }
    if (param.enum) {
      constraints.push(`one of: [${param.enum.join(', ')}]`);
    }
    
    return constraints.length > 0 ? `(${constraints.join(', ')})` : '';
  }

  /**
   * Handle the exit command (no special logic needed, just return exit indication)
   * @returns {Object} - Result of the exit command
   */
  async handleExitCommand() {
    return {
      output: 'Goodbye!',
      exit: true
    };
  }

  /**
   * Process a command and apply side effects manually
   * @param {Object} command - The parsed command object
   * @returns {Promise<Object>} - The result of command processing
   */
  async processParsedCommand(command) {
    try {
      // Execute the command through the handler
      const result = await this.handler.handleCommand(command);

      // Apply side effects and save state if command was successful
      if (!result.error) {
        const commandSpec = manifest.commands.find(c => c.name === command.name);
        if (commandSpec) {
          stateManager.applySideEffects(command, commandSpec);
          stateManager.saveState();
        }
      }

      return result;
    } catch (error) {
      return { 
        error: `Command processing error: ${error.message}`, 
        output: null 
      };
    }
  }

  /**
   * Get the current state
   * @returns {Map} - The current state map
   */
  getState() {
    return this.state;
  }

  /**
   * Get the manifest
   * @returns {Object} - The application manifest
   */
  getManifest() {
    return manifest;
  }

  /**
   * Get the parser instance
   * @returns {CommandParser} - The command parser
   */
  getParser() {
    return this.parser;
  }

  /**
   * Get the handler instance
   * @returns {CommandHandler} - The command handler
   */
  getHandler() {
    return this.handler;
  }
}