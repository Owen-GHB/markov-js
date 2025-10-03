import fs from 'fs';
import path from 'path';
import pathResolver from '../../utils/path-resolver.js';

/**
 * Manages the UI for the Electron application, including checking and loading
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
   * Check if the served UI directory exists and has required files
   * @param {string} filename - The UI filename to check (default: 'index.html')
   * @returns {boolean} True if the served UI directory exists and has the file
   */
  hasServedUI(filename = 'index.html') {
    const servedDir = pathResolver.getServedUIDir();
    const indexPath = path.join(servedDir, filename);
    return fs.existsSync(servedDir) && fs.existsSync(indexPath);
  }

  /**
   * Generate the UI (explicit generation - separate from serving)
   * @param {string} filename - The UI filename (default: 'index.html')
   * @returns {Promise<void>}
   */
  async generateUI(filename = 'index.html') {
    const { UI } = await import('../../generator/UI.js');
    const { manifest } = await import('../../contract.js');
    
    const outputDir = pathResolver.getGeneratedUIDir();
    const templateDir = pathResolver.templatesDir;
    
    const generator = new UI();
    try {
      await generator.generate(manifest, outputDir, templateDir, filename);
      console.log(`Generated UI at: ${path.join(outputDir, filename)}`);
    } catch (error) {
      console.error('Failed to generate UI:', error);
      throw error;
    }
  }

  /**
   * Get the UI file path from the served UI directory
   * @param {string} filename - The UI filename (default: 'index.html')
   * @returns {string} The path to the UI file
   */
  getUIPath(filename = 'index.html') {
    const servedDir = pathResolver.getServedUIDir();
    return path.join(servedDir, filename);
  }

  /**
   * Load and return the UI content from the served UI directory
   * @param {string} filename - The UI filename (default: 'index.html')
   * @returns {string} The UI content
   */
  loadUIContent(filename = 'index.html') {
    // Check if UI exists first
    if (!this.hasServedUI(filename)) {
      throw new Error(`UI files not found. Directory '${pathResolver.getServedUIDir()}' does not exist or is missing ${filename}.'`);
    }
    
    const uiPath = this.getUIPath(filename);
    return fs.readFileSync(uiPath, 'utf8');
  }
}