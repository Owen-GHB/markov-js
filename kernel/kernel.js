import { PluginLoader } from './utils/PluginLoader.js';
import { loadManifest } from './contract.js';
import { resolveSecurePath } from './utils/path-resolver.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Launch the kernel infrastructure with the given arguments and project root
 * @param {string[]} args - Command line arguments
 * @param {string} projectRoot - The project root directory
 * @returns {Promise<void>}
 */
export async function launch(args, projectRoot) {
  const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
  const pluginLoader = new PluginLoader(config.pluginsDir);
  const manifest = loadManifest(config.pluginsDir);

  const run = async (plugin, method, ...params) => {
    const fn = await pluginLoader.getPluginMethod(plugin, method);
    if (!fn) {
      console.error(`❌ ${plugin}.${method} not found or invalid`);
      process.exit(1);
    }
    return fn(__dirname, projectRoot, ...params);
  };

  if (args.includes('--electron')) {
    const servedUIDir      = resolveSecurePath(manifest.stateDefaults.servedUIDir, projectRoot);
    const electronPreloadPath = resolveSecurePath(manifest.stateDefaults.electronPreloadPath, projectRoot);
    return run('electron', 'start', servedUIDir, electronPreloadPath);
  }

  if (args.includes('--generate')) {
    const userTemplateDir  = resolveSecurePath(manifest.stateDefaults.userTemplateDir, projectRoot);
    const generatedUIDir   = resolveSecurePath(manifest.stateDefaults.generatedUIDir, projectRoot);
    return run('generate', 'run', userTemplateDir, generatedUIDir);
  }

  if (args.includes('--http')) {
    const port        = manifest.stateDefaults.serverPort;
    const servedUIDir = resolveSecurePath(manifest.stateDefaults.servedUIDir, projectRoot);
    const apiEndpoint = manifest.stateDefaults.apiEndpoint;
    return run('http', 'start', port, servedUIDir, apiEndpoint);
  }

  console.log('Kernel command-line interface');
  console.log('Available commands:');
  console.log('  --generate             Generate UI from contracts using EJS templates');
  console.log('  --http                 Serve UI and API on specified port (default 8080)');
  console.log('  --electron             Launch Electron application');
  process.exit(0);
}

// Note: This file is not meant to be run directly. Use kernel.js in the project root.
