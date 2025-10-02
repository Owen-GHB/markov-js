import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Utility class for reading and parsing manifest files
 */
export class ManifestReader {
  /**
   * Read the global manifest from the contract directory
   * @param {string} contractDir - Path to the contract directory
   * @returns {Object} The global manifest
   */
  static readGlobalManifest(contractDir = '../../../contract') {
    // If contractDir is an absolute path, use it directly; otherwise join with __dirname
    let contractPath;
    if (path.isAbsolute(contractDir)) {
      contractPath = contractDir;
    } else {
      contractPath = path.join(__dirname, contractDir);
    }
    
    const globalManifestPath = path.join(contractPath, 'global.json');
    if (!fs.existsSync(globalManifestPath)) {
      throw new Error(`Global manifest not found at: ${globalManifestPath}`);
    }
    
    const globalManifest = JSON.parse(fs.readFileSync(globalManifestPath, 'utf8'));
    return globalManifest;
  }

  /**
   * Read all command manifests from the contract directory
   * @param {string} contractDir - Path to the contract directory
   * @returns {Array} Array of command manifest objects
   */
  static readCommandManifests(contractDir = '../../../contract') {
    // If contractDir is an absolute path, use it directly; otherwise join with __dirname
    let contractPath;
    if (path.isAbsolute(contractDir)) {
      contractPath = contractDir;
    } else {
      contractPath = path.join(__dirname, contractDir);
    }
    
    if (!fs.existsSync(contractPath)) {
      throw new Error(`Contract directory not found: ${contractPath}`);
    }

    const items = fs.readdirSync(contractPath, { withFileTypes: true });
    const commandDirs = items
      .filter(dirent => dirent.isDirectory() && dirent.name !== 'index.js')
      .map(dirent => dirent.name);

    const commandManifests = [];
    for (const dir of commandDirs) {
      const manifestPath = path.join(contractPath, dir, 'manifest.json');
      if (fs.existsSync(manifestPath)) {
        try {
          const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
          commandManifests.push(manifest);
        } catch (error) {
          console.warn(`Warning: Could not parse manifest for command ${dir}:`, error.message);
        }
      }
    }

    return commandManifests;
  }

  /**
   * Read all manifests (global + command manifests)
   * @param {string} contractDir - Path to the contract directory
   * @returns {Object} Object containing global manifest and command manifests
   */
  static readAllManifests(contractDir = '../../../contract') {
    const globalManifest = this.readGlobalManifest(contractDir);
    const commandManifests = this.readCommandManifests(contractDir);

    return {
      global: globalManifest,
      commands: commandManifests
    };
  }
  
  /**
   * Get optional CSS if it exists
   * @param {string} contractDir - Path to the contract directory
   * @returns {string|null} CSS content if file exists, null otherwise
   */
  static readCSS(contractDir = '../../../contract') {
    // This method is deprecated. CSS is now loaded from the templates directory.
    // The UI generator uses templatesDir for CSS loading instead.
    return null;
  }
}