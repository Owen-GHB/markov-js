import path from 'path';
import { fileURLToPath } from 'url';
import { loadManifest } from './contract.js';
import { ResourceLoader } from './utils/ResourceLoader.js';
import { resolveSecurePath } from './utils/path-resolver.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Universal launch function that can handle both user app and kernel commands
 * @param {string[]} args - Command line arguments
 * @param {string} projectRoot - The project root directory  
 * @returns {Promise<void>}
 */
export async function launch(args, projectRoot) {
  // Check for --help first (meta-help above all helps)
  if (args.includes('--help')) {
    showMetaHelp();
    return;
  }

  // Determine execution path
  const vertexIndex = args.indexOf('--vertex');
  const isKernelMode = vertexIndex !== -1;
  const kernelCommandRoot = path.resolve(__dirname, 'command-plugins');
  
  if (isKernelMode) {
    // Kernel commands: use kernel's command-plugins as "command root"
    const kernelArgs = args.slice(vertexIndex + 1);
    
    return await executeCommandPath(kernelArgs, projectRoot, kernelCommandRoot, true);
  } else {
    // User app commands: use actual project root
    return await executeCommandPath(args, projectRoot, kernelCommandRoot, false);
  }
}

/**
 * Universal command execution path - works for both user app and kernel commands
 * @param {string[]} args - Command arguments
 * @param {string} stateRoot - Where to store state files
 * @param {string} commandRoot - Where to load commands/manifests from
 * @param {boolean} isKernelMode - Whether we're in kernel mode (affects context file path)
 * @returns {Promise<void>}
 */
async function executeCommandPath(args, projectRoot, kernelCommandRoot, isKernelMode) {
  // Load manifest from the kernel command root
  const manifest = loadManifest(kernelCommandRoot);

  // Use default plugins (CLI/REPL)
  const defaultPluginsDir = path.join(__dirname, 'default-plugins');
  const loader = new ResourceLoader(defaultPluginsDir);

  // CRITICAL: Determine context
  let contextFilePath;
  let commandRoot;
  if (isKernelMode) {
    // Kernel mode: use vertex-config.json in the user's project root
    contextFilePath = path.join(projectRoot, 'vertex-config.json');
    commandRoot = kernelCommandRoot;
  } else {
    // Application mode: use the path from manifest (relative to kernelCommandRoot)
    contextFilePath = path.resolve(kernelCommandRoot, manifest.stateDefaults.contextFilePath);
    commandRoot = projectRoot;
  }

  const run = async (plugin, method, ...params) => {
    const fn = await loader.getResourceMethod(plugin, method);
    if (!fn) {
      console.error(`❌ ${plugin}.${method} not found or invalid`);
      process.exit(1);
    }
    // KEY: Pass commandRoot so CLI/REPL load commands from the right place
    return fn(__dirname, commandRoot, ...params);
  };

  if (args.length === 0) {
    // REPL mode
    return run(
      'repl',
      'start',
      contextFilePath,
      manifest.stateDefaults.replHistoryFilePath,
      manifest.stateDefaults.maxHistory
    );
  }

  // CLI mode
  return run('cli', 'run', contextFilePath, args);  // Use the determined context file path
}

/**
 * Show the meta-help that sits above both help systems
 */
function showMetaHelp() {
  console.log(`
🧠 Vertex Framework - Universal Command Engine
===============================================

USAGE:
  [your-entrypoint.js] [app-commands...]           # Run application commands
  [your-entrypoint.js] --vertex [kernel-commands...] # Run kernel commands
  [your-entrypoint.js] --help                      # Show this help

EXAMPLES:
  [your-entrypoint.js] --vertex help               # Kernel help
  [your-entrypoint.js] help                        # Application help

META-HELP:
  • Application commands operate on the hosted application
  • Kernel commands manage the Vertex application hosting kernel
  • Use 'help' for application command help
  • Use '--vertex help' for kernel command help
  `);
}

// Note: This file is not meant to be run directly. Use a project-specific entry point.