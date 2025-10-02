import { generateText } from '../../textgen/index.js';

/**
 * Handle the "generate" command
 * @param {Object} params - The command parameters
 * @returns {Promise<Object>} - The result of the generation
 */
export default async function handleGenerate(params) {
	return await generateText(params);
}
