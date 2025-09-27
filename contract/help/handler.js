/**
 * Get the help text for the application
 * @returns {string} - The help text
 */
export function getHelpText() {
  return `
🔗 Markov Chain Text Generator
=============================

Available commands:
train(file, modelType, [options]) - Train model from text file
    Required:
        file - Corpus file to train from
        modelType - "markov", "vlmm", or "hmm"
    Options (key=value):
        order=N - Markov order (default: 2)
        modelName=name.json - Save as specific filename

generate(model, [options]) - Generate text from model
    Required:
        model - Model file to use
    Options (key=value):
        length=N - Number of tokens to generate (default: 100)
        temperature=N - Randomness factor (0-2, default: 1)
        prompt="text" - Starting text for generation

listModels() - List available saved models
listCorpus() - List available corpus files
delete("modelName.json") - Delete a saved model
use("modelName.json") - Set current model to use
stats() - Show model statistics
pgb_search("query") - Search Project Gutenberg by title/author
pgb_info(id_or_title) - Get book details from Project Gutenberg
pgb_download(id|title, [file="filename.txt"]) - Download book from Project Gutenberg
help() - Show this help message
exit - Exit the program

Command Syntax:
• Function style: command(param1, param2, key=value)
• Object style: command({param1: value, key: value})
• Simple style: command
`;
}

/**
 * Handle the "help" command
 * @param {Object} params - The command parameters
 * @returns {Object} - The result of the help command
 */
export default async function handleHelp(params) {
  return {
    error: null,
    output: getHelpText(),
  };
}