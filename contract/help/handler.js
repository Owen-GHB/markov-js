import { manifest } from '../../kernel/contract.js';

/**
 * Get the help text for the application
 * @returns {string} - The help text (synchronous to match contract expectations)
 */
export function getHelpText() {
  // The manifest object contains both global info and commands
  // The structure is: { name, description, ...globalProps, commands: [...] }
  const appName = manifest.name || 'Application';
  const appDescription = manifest.description || 'Command-line application';
  const commands = manifest.commands || [];
  
  let helpText = `\n🔗 ${appName} - ${appDescription}
=============================\n\nAvailable commands:\n`;
  
  // Sort commands alphabetically for consistent display
  const sortedCommands = commands.sort((a, b) => a.name.localeCompare(b.name));
  
  for (const cmd of sortedCommands) {
    // Add command name and syntax
    helpText += `${cmd.name}${getParamsSignature(cmd)} - ${cmd.description}\n`;
    
    // Show required parameters
    const requiredParams = cmd.parameters ? cmd.parameters.filter(p => p.required) : [];
    const optionalParams = cmd.parameters ? cmd.parameters.filter(p => !p.required) : [];
    
    if (requiredParams.length > 0) {
      helpText += "    Required:\n";
      for (const param of requiredParams) {
        helpText += `        ${param.name} - ${param.description}\n`;
      }
    }
    
    // Show optional parameters
    if (optionalParams.length > 0) {
      helpText += "    Options (key=value):\n";
      for (const param of optionalParams) {
        const defaultValue = param.default !== undefined ? ` (default: ${param.default})` : '';
        const constraints = getParamConstraints(param);
        const constraintText = constraints ? ` ${constraints}` : '';
        helpText += `        ${param.name}=${param.type}${defaultValue}${constraintText} - ${param.description}\n`;
      }
    }
    
    helpText += "\n";
  }
  
  helpText += `help() - Show this help message\n\nCommand Syntax:\n• Function style: command(param1, param2, key=value)\n• Object style: command({param1: value, key: value})\n• Simple style: command\n`;
  
  return helpText;
}

/**
 * Generate parameter signature for a command
 * @param {Object} cmd - The command manifest
 * @returns {string} - Formatted parameter signature
 */
function getParamsSignature(cmd) {
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
 * Get parameter constraints description
 * @param {Object} param - The parameter manifest
 * @returns {string} - Constraints description
 */
function getParamConstraints(param) {
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
 * Handle the "help" command
 * @param {Object} params - The command parameters
 * @returns {Object} - The result of the help command
 */
export default function handleHelp(params) {
  if (params && params.command) {
    // Show help for specific command
    const commands = manifest.commands || [];
    const cmd = commands.find(c => c.name === params.command);
    
    if (cmd) {
      let cmdHelp = `\n🔗 ${cmd.name}${getParamsSignature(cmd)}\n`;
      cmdHelp += `   ${cmd.description}\n\n`;
      
      const requiredParams = cmd.parameters ? cmd.parameters.filter(p => p.required) : [];
      const optionalParams = cmd.parameters ? cmd.parameters.filter(p => !p.required) : [];
      
      if (requiredParams.length > 0) {
        cmdHelp += "   Required parameters:\n";
        for (const param of requiredParams) {
          cmdHelp += `     • ${param.name}: ${param.type} - ${param.description}\n`;
        }
        cmdHelp += "\n";
      }
      
      if (optionalParams.length > 0) {
        cmdHelp += "   Optional parameters:\n";
        for (const param of optionalParams) {
          const defaultValue = param.default !== undefined ? ` (default: ${param.default})` : '';
          const constraints = getParamConstraints(param);
          const constraintText = constraints ? ` ${constraints}` : '';
          cmdHelp += `     • ${param.name}: ${param.type}${defaultValue}${constraintText} - ${param.description}\n`;
        }
        cmdHelp += "\n";
      }
      
      if (cmd.examples && cmd.examples.length > 0) {
        cmdHelp += "   Examples:\n";
        for (const example of cmd.examples) {
          cmdHelp += `     ${example}\n`;
        }
      }
      
      return {
        error: null,
        output: cmdHelp,
      };
    } else {
      return {
        error: `Unknown command: ${params.command}`,
        output: null,
      };
    }
  } else {
    // Show help for all commands
    const helpText = getHelpText();
    return {
      error: null,
      output: helpText,
    };
  }
}