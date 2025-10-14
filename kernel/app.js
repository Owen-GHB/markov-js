import path from 'path';
import { fileURLToPath } from 'url';
import { loadManifest } from './contract.js';
import { ResourceLoader } from './utils/ResourceLoader.js';
import { resolveSecurePath } from './utils/path-resolver.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Launch the hosted application with the given arguments and project root
 * @param {string[]} args - Command line arguments
 * @param {string} projectRoot - The project root directory
 * @returns {Promise<void>}
 */
export async function launch(args, projectRoot) {
  const pluginsDir = resolveSecurePath('./command-plugins', __dirname);
  const manifest = loadManifest(pluginsDir);

  const defaultPluginsDir = path.join(__dirname, 'default-plugins');
  const loader = new ResourceLoader(defaultPluginsDir);

  const run = async (plugin, method, ...params) => {
    const fn = await loader.getResourceMethod(plugin, method);
    if (!fn) {
      console.error(`❌ ${plugin}.${method} not found or invalid`);
      process.exit(1);
    }
    return fn(__dirname, projectRoot, ...params);
  };

  if (args.length === 0) {
    // REPL mode
    return run(
      'repl',
      'start',
      manifest.stateDefaults.contextFilePath,
      manifest.stateDefaults.replHistoryFilePath,
      manifest.stateDefaults.maxHistory
    );
  }

  // CLI mode
  return run('cli', 'run', manifest.stateDefaults.contextFilePath, args);
}

// Note: This file is not meant to be run directly. Use main.js in the project root.
