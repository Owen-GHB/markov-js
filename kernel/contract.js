import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Synchronously load and cache all manifests and handlers at module initialization
let contractCache = null;

function initializeContractSync() {
  if (contractCache) {
    return contractCache;
  }

  // Load global manifest - Note: this is domain-specific and makes kernel not fully generic
  const globalManifest = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../contract/global.json'), 'utf8')
  );

  // Get all command directories from the contract folder
  const contractDir = path.join(__dirname, '../contract');
  const items = fs.readdirSync(contractDir, { withFileTypes: true });
  const commandDirs = items
    .filter(dirent => dirent.isDirectory() && 
              dirent.name !== 'index.js' && 
              dirent.name !== 'global.json')
    .map(dirent => dirent.name);

  // Load all manifest slices synchronously
  const commands = [];
  const handlers = {};

  for (const dir of commandDirs) {
    try {
      // Load manifest slice from contract directory
      const contractDir = path.join(__dirname, '../contract');
      const manifestPath = path.join(contractDir, dir, 'manifest.json');
      const manifestSlice = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      commands.push(manifestSlice);

      // For handlers, we need to use dynamic imports, but we can prepare the mappings
      // The handlers will be loaded asynchronously but cached
      handlers[dir] = null; // Will be loaded on first access
    } catch (error) {
      console.warn(`Warning: Could not load from ${dir}:`, error.message);
    }
  }

  const manifest = {
    ...globalManifest,
    commands: commands,
  };

  // Create a lazy loading handler registry
  const handlerRegistry = new Map();
  
  // Create a function to get a handler by command name, loading it on first access
  const getHandler = async (commandName) => {
    if (handlerRegistry.has(commandName)) {
      return handlerRegistry.get(commandName);
    }
    
    try {
      const handlerModule = await import(`../contract/${commandName}/handler.js`);
      // Find the handler class in the module exports
      for (const key of Object.keys(handlerModule)) {
        const HandlerClass = handlerModule[key];
        if (HandlerClass && typeof HandlerClass === 'function' && HandlerClass.name && HandlerClass.name.endsWith('Handler')) {
          const handlerInstance = new HandlerClass();
          handlerRegistry.set(commandName, handlerInstance);
          return handlerInstance;
        }
      }
      
      console.warn(`Warning: Could not find handler class in ${commandName}/handler.js`);
      return null;
    } catch (error) {
      console.warn(`Warning: Could not load handler from ${commandName}/handler.js:`, error.message);
      return null;
    }
  };

  contractCache = {
    manifest,
    getHandler,
    async getHandlers() {
      // Load all handlers (this would be used infrequently)
      for (const dir of commandDirs) {
        if (!handlerRegistry.has(dir)) {
          await getHandler(dir);
        }
      }
      // Return a proxy so that handler access is async
      const asyncHandlers = {};
      for (const dir of commandDirs) {
        asyncHandlers[dir] = await getHandler(dir);
      }
      return asyncHandlers;
    }
  };

  return contractCache;
}

// Initialize the contract synchronously at module load time for manifest
const { manifest } = initializeContractSync();

// Export the manifest synchronously (this is what the parsers need)
// and async functions for handlers
export { manifest };

// Export a function to get the handler for a specific command
export const getHandler = async (commandName) => {
  const contract = initializeContractSync();
  return await contract.getHandler(commandName);
};

// Export a function to get the full contract
export const getContract = async () => {
  const contract = initializeContractSync();
  return {
    manifest: contract.manifest,
    getHandler: contract.getHandler
  };
};