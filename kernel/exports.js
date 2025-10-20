// File: exports.js (in kernel root)

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