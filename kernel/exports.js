// File: exports.js (in kernel root)

export { manifestReader } from './src/manifestReader.js';
export { Parser } from './src/Parser.js';
export { Runner } from './src/Runner.js';
export { StateManager } from './src/StateManager.js';
export { formatResult } from './src/utils/format.js';
export { HelpHandler } from './src/utils/help.js';
export { Evaluator } from './src/Evaluator.js';
export { Processor } from './src/Processor.js';
export { Executor } from './src/Executor.js';

// New Vertex dependency container - only what transports actually need
import { manifestReader } from './src/manifestReader.js';
import { StateManager } from './src/StateManager.js';
import { formatResult } from './src/utils/format.js';
import { HelpHandler } from './src/utils/help.js';
import { Executor } from './src/Executor.js';

/**
 * Vertex dependency container - provides only the utilities actually used by transports
 */
export class Vertex {
  constructor() {
    this.manifestReader = manifestReader;
    this.StateManager = StateManager;
    this.formatResult = formatResult;
    this.HelpHandler = HelpHandler;
    this.Executor = Executor;
  }
}