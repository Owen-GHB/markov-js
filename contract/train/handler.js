import { trainModel } from '../../textgen/index.js';

/**
 * Handle the "train" command
 * @param {Object} params - The command parameters
 * @returns {Promise<Object>} - The result of the training
 */
export default async function handleTrain(params) {
	return await trainModel(params);
}
