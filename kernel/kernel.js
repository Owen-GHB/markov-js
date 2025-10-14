import { loadManifest } from './contract.js';
import { resolveSecurePath } from './utils/path-resolver.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname   = path.dirname(__filename);

/**
 * Launch the kernel infrastructure as a CLI that executes commands
 * defined in the plugin-directory manifest.
 * @param {string[]} args - Command line arguments (same syntax as hosted CLI)
 * @param {string} projectRoot - The project root directory
 * @returns {Promise<void>}
 */
export async function launch(args, projectRoot) {
  // 1. Load kernel-side config (only to know where the plugin dir is)
  const pluginDir     = resolveSecurePath('./command-plugins', __dirname);
  const manifest      = loadManifest(pluginDir);          // ← plugin-dir manifest

  // 2. Build a CommandProcessor for that manifest
  const { CommandProcessor } = await import(
    new URL('./processor/CommandProcessor.js', import.meta.url).href
  );
  const processor = new CommandProcessor(pluginDir, manifest);

  // 3. Kernel-specific state file (lives in project root)
  const kernelStateFile = path.join(projectRoot, 'vertex-config.json');
  if (fs.existsSync(kernelStateFile)) {
    processor.stateManager.loadState(kernelStateFile);
  } else {
    // first-run: seed with manifest defaults
    processor.stateManager.state = new Map(Object.entries(manifest.stateDefaults || {}));
  }

  // 4. Same CLI logic as before
  const input = args.length ? args.join(' ') : 'help()';
  const result = await processor.processCommand(input, kernelStateFile);

  if (result.error) {
    console.error(`❌ ${result.error}`);
    process.exit(1);
  }
  if (result.output) {
    console.log(result.output);
  }
  if (result.exit) {
    process.exit(0);
  }
}

// Note: This file is not meant to be run directly. Use kernel-main.js in the project root.