/**
 * Built-in help command handler for REPL/CLI transports
 */

export class HelpCommand {
  /**
   * Handle the help command
   * @param {Object} command - The parsed command object
   * @param {Object} context - Execution context containing manifest
   * @returns {Object} Command result with help text
   */
  async handle(command, context) {
    const { manifest } = context;
    const { args = {} } = command;
    const specificCommand = args.command;

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
   * Get command metadata for help display
   * @returns {Object} Command metadata
   */
  getMetadata() {
    return {
      name: 'help',
      description: 'Show help information',
      parameters: [
        {
          name: 'command',
          type: 'string',
          required: false,
          description: 'Specific command to get help for'
        }
      ],
      examples: [
        'help()',
        'help("train")'
      ]
    };
  }
}