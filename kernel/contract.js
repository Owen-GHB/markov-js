import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pathResolver from './utils/path-resolver.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Synchronously load and cache all manifests at module initialization
let contractCache = null;

function initializeContractSync() {
  if (contractCache) {
    return contractCache;
  }

  // Load global manifest from contract directory using path resolver
  const globalManifest = JSON.parse(
    fs.readFileSync(path.join(pathResolver.getContractDir(), 'global.json'), 'utf8')
  );

  // Get all command directories from the contract folder using path resolver
  const contractDir = pathResolver.getContractDir();
  const items = fs.readdirSync(contractDir, { withFileTypes: true });
  const commandDirs = items
    .filter(dirent => dirent.isDirectory() && 
              dirent.name !== 'index.js' && 
              dirent.name !== 'global.json' &&
              dirent.name !== 'exit' &&      // Filter out built-in commands
              dirent.name !== 'help')         // Filter out built-in commands
    .map(dirent => dirent.name);

  // Load all manifest slices synchronously
  const commands = [];

  for (const dir of commandDirs) {
    try {
      // Load manifest slice from contract directory
      const manifestPath = path.join(contractDir, dir, 'manifest.json');
      let manifestSlice = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      
      // If this is an external-method command, resolve the module path ahead of time
      if (manifestSlice.commandType === 'external-method' && manifestSlice.modulePath) {
        // Use the project root from the path resolver to resolve the module path
        const projectRoot = pathResolver.getProjectRoot();
        const absoluteModulePath = path.resolve(projectRoot, manifestSlice.modulePath);
        // Add the resolvedAbsolutePath to the manifest for use by the command handler
        manifestSlice = {
          ...manifestSlice,
          resolvedAbsolutePath: absoluteModulePath
        };
      }
      
      commands.push(manifestSlice);
    } catch (error) {
      console.warn(`Warning: Could not load from ${dir}:`, error.message);
    }
  }

  const manifest = {
    ...globalManifest,
    commands: commands,
  };

  contractCache = {
    manifest
  };

  return contractCache;
}

// Initialize the contract synchronously at module load time for manifest
const { manifest } = initializeContractSync();

// Export only the manifest (this is what the processors need)
export { manifest };