import { CommandHandler } from '../../CommandHandler.js';
import { manifest } from '../../contract.js';

/**
 * Handles commands for the Electron application via IPC
 */
export class ElectronCommandHandler {
  constructor() {
    this.commandHandler = new CommandHandler();
  }

  /**
   * Execute a command through the kernel
   * @param {Object} command - The command to execute
   * @returns {Promise<Object>} - The result of the command execution
   */
  async executeCommand(command) {
    try {
      const result = await this.commandHandler.handleCommand(command);
      return result;
    } catch (error) {
      return { error: error.message, output: null };
    }
  }

  /**
   * Get the manifests for the application
   * @returns {Object} - The manifests
   */
  getManifests() {
    try {
      return manifest;
    } catch (error) {
      return { error: error.message };
    }
  }

  /**
   * Get available commands from the manifest
   * @returns {Array} - List of available commands
   */
  getAvailableCommands() {
    try {
      return manifest.commands || [];
    } catch (error) {
      return [];
    }
  }
}