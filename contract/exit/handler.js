export class ExitHandler {
  /**
   * Handle the "exit" command
   * @param {Object} params - The command parameters
   * @returns {Object} - The result of the exit command
   */
  async handleExit(params) {
    return {
      error: null,
      output: null,
    };
  }
}