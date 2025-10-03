/**
 * Handle the "randomize" command
 * @param {Object} params - The command parameters
 * @returns {Object} - The result with randomized word
 */
export default async function handleRandomize(params) {
  const { word } = params || {};

  if (!word) {
    return {
      error: 'Word parameter is required (e.g., randomize("hello"))',
      output: null,
    };
  }

  if (typeof word !== 'string') {
    return {
      error: 'Word parameter must be a string',
      output: null,
    };
  }

  // Randomize the characters in the word
  const randomized = word.split('').sort(() => Math.random() - 0.5).join('');
  
  return {
    error: null,
    output: `🔀 Randomized "${word}" → "${randomized}"`,
  };
}