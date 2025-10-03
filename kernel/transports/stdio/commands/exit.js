/**
 * Built-in exit command handler for REPL/CLI transports
 */

export class ExitCommand {
  /**
   * Handle the exit command
   * @param {Object} command - The parsed command object
   * @param {Object} context - Execution context
   * @returns {Object} Command result
   */
  async handle(command, context) {
    // For REPL, we'll use side effects to signal exit
    return {
      output: 'Goodbye!',
      exit: true  // Signal to REPL that it should exit
    };
  }

  /**
   * Get command metadata for help display
   * @returns {Object} Command metadata
   */
  getMetadata() {
    return {
      name: 'exit',
      description: 'Exit the program',
      parameters: [],
      examples: ['exit()']
    };
  }
}