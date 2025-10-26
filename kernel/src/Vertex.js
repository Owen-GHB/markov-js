import { Runner } from './Runner.js';
import { loadManifest } from './loaders/manifestLoader.js';
import { HelpHandler } from './utils/help.js';

// Processor imports
import { Parser } from './processors/Parser.js';
import { Required } from './processors/Required.js';
import { Type } from './processors/Type.js';
import { Default } from './processors/Default.js';
import { State } from './processors/State.js';
import { Template } from './processors/Template.js';

export class Vertex {
  constructor(options = {}) {
    this.commandRoot = options.commandRoot || process.cwd();
    this.manifest = loadManifest(this.commandRoot);
    this.runner = new Runner(this.commandRoot);
    
    // Pass options to processors that need them
    this.preProcessors = this.createProcessors('pre', options);
    this.postProcessors = this.createProcessors('post', options);
  }

  async executeCommand(input) {
    let context = { 
      input, 
      manifest: this.manifest
    };

    // PRE-PROCESS
    for (const processor of this.preProcessors) {
      context = await processor.preProcess(context);
    }

    // EXECUTE
    context.result = await this.runner.runCommand(context.command, context.commandSpec);

    // POST-PROCESS  
    for (const processor of this.postProcessors) {
      context = await processor.postProcess(context);
    }

    return context.result;
  }

  createProcessors(phase, options) {
    const ProcessorClasses = {
      pre: [Parser, State, Required, Default, Type],
      post: [State, Template]
    };

    return ProcessorClasses[phase].map(Processor => {
      // Pass necessary options to processors that need them
      if (Processor === State) {
        return new State({
          contextFilePath: options.contextFilePath,
          manifest: this.manifest
        });
      }
      return new Processor();
    });
  }

  getHelpText() {
    return HelpHandler.formatGeneralHelp(this.manifest);
  }
}