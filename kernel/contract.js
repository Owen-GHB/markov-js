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

  // Load global manifest from contract directory
  const globalManifest = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../contract/global.json'), 'utf8')
  );

  // Get all command directories from the contract folder
  const contractDir = path.join(__dirname, '../contract');
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
  const handlers = {};

  for (const dir of commandDirs) {
    try {
      // Load manifest slice from contract directory
      const manifestPath = path.join(contractDir, dir, 'manifest.json');
      const manifestSlice = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      commands.push(manifestSlice);

      // For handlers, we need to use dynamic imports, but we can prepare the mappings
      // The handlers will be loaded asynchronously but cached
      handlers[manifestSlice.name] = null; // Will be loaded on first access, keyed by manifest name
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
      // Find the directory that contains this command by looking at manifest names
      const commandDir = commandDirs.find(dir => {
        try {
          const manifestPath = path.join(contractDir, dir, 'manifest.json');
          const manifestSlice = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
          return manifestSlice.name === commandName;
        } catch (error) {
          return false;
        }
      });
      
      if (!commandDir) {
        console.warn(`Warning: Could not find directory for command ${commandName}`);
        return null;
      }
      
      // Load the handler function from the handler file
      // Modern handlers export their main function as default
      const handlerModule = await import(`../contract/${commandDir}/handler.js`);
      
      // Check if it exports a default function (modern approach)
      if (handlerModule.default && typeof handlerModule.default === 'function') {
        handlerRegistry.set(commandName, handlerModule.default);
        return handlerModule.default;
      }
      
      // Check if it exports a class with a method (legacy approach for backward compatibility)
      for (const key of Object.keys(handlerModule)) {
        const HandlerClass = handlerModule[key];
        if (HandlerClass && typeof HandlerClass === 'function' && HandlerClass.name && HandlerClass.name.endsWith('Handler')) {
          const handlerInstance = new HandlerClass();
          // Try to find the appropriate method name based on command name
          const methodName = 'handle' + commandName.charAt(0).toUpperCase() + commandName.slice(1)
            .replace(/_([a-z])/g, (match, letter) => letter.toUpperCase())
            .replace(/([A-Z])/g, (match, letter, index) => 
              index === 0 ? letter.toLowerCase() : letter);
          
          if (typeof handlerInstance[methodName] === 'function') {
            // Create a wrapper function that calls the method
            const handlerFunction = async (args) => {
              return await handlerInstance[methodName](args);
            };
            handlerRegistry.set(commandName, handlerFunction);
            return handlerFunction;
          }
        }
      }
      
      console.warn(`Warning: Handler for ${commandName} does not export a default function or compatible class method`);
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
        try {
          const manifestPath = path.join(contractDir, dir, 'manifest.json');
          const manifestSlice = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
          const commandName = manifestSlice.name;
          
          if (!handlerRegistry.has(commandName)) {
            await getHandler(commandName);
          }
        } catch (error) {
          console.warn(`Warning: Could not load handler for directory ${dir}:`, error.message);
        }
      }
      
      // Return a proxy so that handler access is async
      const asyncHandlers = {};
      for (const dir of commandDirs) {
        try {
          const manifestPath = path.join(contractDir, dir, 'manifest.json');
          const manifestSlice = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
          const commandName = manifestSlice.name;
          asyncHandlers[commandName] = await getHandler(commandName);
        } catch (error) {
          console.warn(`Warning: Could not get handler for directory ${dir}:`, error.message);
        }
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