import { Handler } from './Handler.js';
import { loadManifest } from './loaders/manifestLoader.js';
import { HelpHandler } from './utils/help.js';

// Processor imports
import { Parser } from './processors/Parser.js';
import { Required } from './processors/Required.js';
import { Type } from './processors/Type.js';
import { Default } from './processors/Default.js';
import { State } from './processors/State.js';
import { Template } from './processors/Template.js';

// Controller imports
import { Router } from './Router.js';

export class Vertex {
  constructor(options = {}) {
    this.commandRoot = options.commandRoot || process.cwd();
    this.manifest = loadManifest(this.commandRoot);
    this.handler = new Handler(this.commandRoot);
    
    // Processors (data transformation - full pipeline)
    this.preProcessors = this.createProcessors('pre', options);
    this.postProcessors = this.createProcessors('post', options);
    
    // Controllers (execution strategy)
    this.executor = this.createExecutor();
  }
  
  createExecutor() {
    const ControllerClasses = [Router]; // Router handles chaining + focused preprocessing
    
    // Start with basic handler execution
    let executor = this.handler.handleCommand.bind(this.handler);
    
    // Wrap with controllers
    for (const Controller of ControllerClasses) {
      executor = Controller.createExecutor(this.handler, this.manifest, {
        // Could pass processor options here if needed
      });
    }
    
    return executor;
  }
  
  async executeCommand(input) {
    let context = { input, manifest: this.manifest };
    
    // FULL PRE-PROCESS (Vertex's complete pipeline)
    for (const processor of this.preProcessors) {
      context = await processor.preProcess(context);
    }
    
    // EXECUTE (through controller chain - includes focused preprocessing)
    context.result = await this.executor(context.command, context.commandSpec);
    
    // FULL POST-PROCESS  
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
		return new Processor({
		...options,
		manifest: this.manifest
		});
	});
	}

  getHelpText() {
    return HelpHandler.formatGeneralHelp(this.manifest);
  }
}