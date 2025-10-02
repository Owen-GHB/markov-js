import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Centralized path resolver for the entire kernel
 * Provides consistent path resolution across all kernel modules
 * Focuses on kernel-specific and project structure paths only
 */
class KernelPathResolver {
  constructor() {
    // Determine the project root dynamically
    // This file is at kernel/utils/path-resolver.js
    const currentFileDir = path.dirname(fileURLToPath(import.meta.url)); // kernel/utils/
    this.projectRoot = path.join(currentFileDir, '..'); // Go up 1 level to kernel/
    this.projectRoot = path.join(this.projectRoot, '..'); // Go up 1 more level to project root
  }

  /**
   * Get the project root directory
   * @returns {string} The project root path
   */
  getProjectRoot() {
    return this.projectRoot;
  }

  /**
   * Get the path to the contract directory
   * @returns {string} Path to contract directory
   */
  getContractDir() {
    return path.join(this.projectRoot, 'contract');
  }

  /**
   * Get the path to the generated UI directory
   * @returns {string} Path to generated UI directory
   */
  getGeneratedUIDir() {
    return path.join(this.projectRoot, 'generated-ui');
  }

  /**
   * Get the path to a specific UI file
   * @param {string} filename - The UI filename (default: 'index.html')
   * @returns {string} Path to the UI file
   */
  getUIFilePath(filename = 'index.html') {
    return path.join(this.getGeneratedUIDir(), filename);
  }

  /**
   * Get the path to the electron preload script
   * @returns {string} Path to electron preload script
   */
  getElectronPreloadPath() {
    return path.join(this.projectRoot, 'electron-preload.js');
  }

  /**
   * Get the path to a specific contract manifest
   * @returns {string} Path to the command's manifest
   */
  getContractManifestPath(commandName) {
    return path.join(this.getContractDir(), commandName, 'manifest.json');
  }

  /**
   * Get the path to a specific contract handler
   * @returns {string} Path to the command's handler
   */
  getContractHandlerPath(commandName) {
    return path.join(this.getContractDir(), commandName, 'handler.js');
  }
}

// Create a singleton instance
const pathResolver = new KernelPathResolver();

// Export individual path functions for direct import
export const projectRoot = pathResolver.getProjectRoot();
export const contractDir = pathResolver.getContractDir();
export const generatedUIDir = pathResolver.getGeneratedUIDir();
export const electronPreloadPath = pathResolver.getElectronPreloadPath();

// Export the resolver instance for when more complex path operations are needed
export default pathResolver;