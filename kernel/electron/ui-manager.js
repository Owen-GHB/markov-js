import fs from 'fs';
import { UI } from '../generator/UI.js';
import pathResolver from '../utils/path-resolver.js';
import { manifest } from '../contract.js';

/**
 * Manages the UI for the Electron application, including generation and checking
 */
export class ElectronUIManager {
  /**
   * Check if the UI file exists
   * @param {string} filename - The UI filename to check (default: 'index.html')
   * @returns {boolean} True if the UI file exists
   */
  hasUI(filename = 'index.html') {
    const uiPath = pathResolver.getUIFilePath(filename);
    return fs.existsSync(uiPath);
  }

  /**
   * Generate the UI if it doesn't exist or force generation
   * @param {string} filename - The UI filename (default: 'index.html')
   * @param {boolean} force - Whether to force regeneration even if file exists
   * @returns {Promise<void>}
   */
  async generateUIIfNeeded(filename = 'index.html', force = false) {
    const uiPath = pathResolver.getUIFilePath(filename);
    
    if (!force && fs.existsSync(uiPath)) {
      // UI already exists, no need to generate
      return;
    }
    
    const generator = new UI();
    const outputDir = pathResolver.getGeneratedUIDir();
    const templateDir = pathResolver.templatesDir;
    
    try {
      await generator.generate(manifest, outputDir, templateDir, filename);
      console.log(`Generated UI at: ${uiPath}`);
    } catch (error) {
      console.error('Failed to generate UI:', error);
      throw error;
    }
  }

  /**
   * Get the UI file path
   * @param {string} filename - The UI filename (default: 'index.html')
   * @returns {string} The path to the UI file
   */
  getUIPath(filename = 'index.html') {
    return pathResolver.getUIFilePath(filename);
  }

  /**
   * Load and return the UI content
   * @param {string} filename - The UI filename (default: 'index.html')
   * @returns {string} The UI content
   */
  loadUIContent(filename = 'index.html') {
    const uiPath = this.getUIPath(filename);
    return fs.readFileSync(uiPath, 'utf8');
  }
}