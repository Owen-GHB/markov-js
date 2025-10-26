import { Parser } from './processors/Parser.js';
import { Required } from './processors/Required.js';
import { Type } from './processors/Type.js';
import { Default } from './processors/Default.js';
import { Template } from './processors/Template.js';

export class Router {
  static properties = ['next']; // Handles command chaining

  static createExecutor(handler, manifest, options = {}) {
    // Create the focused preprocessing chain (same as Runner)
    const preProcessors = [
      new Required(),
      new Default(), 
      new Type()
    ];
    
    const baseExecutor = async (command, commandSpec) => {
      return await handler.handleCommand(command, commandSpec);
    };
    
    // Return enhanced executor that handles preprocessing + chaining
    return async (command, commandSpec, originalCommand = null) => {
      if (!originalCommand) originalCommand = command;
      
      // APPLY PREPROCESSING (this was missing!)
      let context = { command, commandSpec };
      for (const processor of preProcessors) {
        context = await processor.preProcess(context);
      }
      command = context.command;
      
      // Execute current command
      const result = await baseExecutor(command, commandSpec);
      
      // Build template context for chaining
      const templateContext = {
        input: command.args,
        output: result,
        original: originalCommand.args,
        originalCommand: originalCommand.name,
      };
      
      // Check for next command in chain
      let nextCommand = null;
      if (commandSpec?.next) {
        nextCommand = this.constructNextCommand(commandSpec.next, templateContext);
      }
      
      // Recursive chaining
      if (nextCommand) {
        const nextCommandSpec = Parser.getSpec(nextCommand, manifest, true);
        if (!nextCommandSpec) {
          throw new Error(`Unknown next command: ${nextCommand.name}`);
        }
        
        // Recursively execute with the SAME executor (maintaining controller chain)
        const chainedExecutor = this.createExecutor(handler, manifest, options);
        return await chainedExecutor(nextCommand, nextCommandSpec, originalCommand);
      }
      
      return result;
    };
  }

  static constructNextCommand(nextConfig, contexts) {
    try {
      const entries = Object.entries(nextConfig);

      for (const [nextCommandName, nextCommandConfig] of entries) {
        if (!nextCommandConfig || typeof nextCommandConfig !== 'object')
          continue;

        let shouldExecute = true;
        if (nextCommandConfig.when) {
          shouldExecute = Template.evaluateConditional(
            nextCommandConfig.when,
            contexts,
          );
        }

        if (shouldExecute) {
          const resolvedArgs = {};
          for (const [paramName, paramConfig] of Object.entries(
            nextCommandConfig.parameters || {},
          )) {
            if (paramConfig.resolve) {
              const resolvedValue = Template.evaluateTemplate(
                paramConfig.resolve,
                contexts,
              );
              try {
                resolvedArgs[paramName] = JSON.parse(resolvedValue);
              } catch {
                resolvedArgs[paramName] = resolvedValue;
              }
            }
          }

          return {
            name: nextCommandName,
            args: resolvedArgs,
          };
        }
      }

      return null;
    } catch (error) {
      throw new Error(`Failed to construct next command: ${error.message}`);
    }
  }
}