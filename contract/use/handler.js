export class UseHandler {
  /**
   * Handle the "use" command
   * @param {Object} params - The command parameters
   * @returns {Object} - The result of the use command
   */
  async handleUse(params) {
    const { modelName } = params || {};

    if (!modelName) {
      return {
        error: 'Model name is required (e.g., use("model.json"))',
        output: null,
      };
    }

    return {
      error: null,
      output: `✅ Using model: ${modelName}`,
    };
  }
}