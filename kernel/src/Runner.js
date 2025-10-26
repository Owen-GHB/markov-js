import { Handler } from './Handler.js';
import { loadManifest } from './loaders/manifestLoader.js';
import { Parser } from './processors/Parser.js';
import { Required } from './processors/Required.js';
import { Type } from './processors/Type.js';
import { Default } from './processors/Default.js';
import { Template } from './processors/Template.js';

/**
 * Runs the command chain with focused preprocessing
 */
export class Runner {
  constructor(commandRoot) {
    this.handler = new Handler(commandRoot);
    this.manifest = loadManifest(commandRoot);
    
    // Runner-specific pipeline: only validation, no state
    this.preProcessors = [
      new Required(),
      new Default(), 
      new Type()
    ];
  }

  /**
   * Run a command and handle full chain execution
   */
  async runCommand(command, commandSpec, originalCommand = null) {
    // Apply Runner's focused preprocessing (validation only)
    let context = { command, commandSpec };
    for (const processor of this.preProcessors) {
      context = await processor.preProcess(context);
    }
    command = context.command;

    if (!originalCommand) originalCommand = command;

    // Execute current command
    const result = await this.handler.handleCommand(command, commandSpec);

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
      nextCommand = this.constructNextCommand(
        commandSpec.next,
        templateContext,
      );
    }

    // If there's a next command, recursively execute the chain
    if (nextCommand) {
      const nextCommandSpec = Parser.getSpec(nextCommand, this.manifest, true);
      if (!nextCommandSpec) {
        throw new Error(`Unknown next command: ${nextCommand.name}`);
      }

      // Recursively execute the chain
      return await this.runCommand(
        nextCommand,
        nextCommandSpec,
        originalCommand || command,
      );
    }

    // End of chain, return final result
    return result;
  }

  /**
   * Construct next command with optional conditional evaluation
   */
  constructNextCommand(nextConfig, contexts) {
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