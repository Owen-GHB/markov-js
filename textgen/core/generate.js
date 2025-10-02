import { ModelSerializer } from '../io/ModelSerializer.js';
import { GenerationContext } from '../models/Interfaces.js';

/**
 * Generate text from a trained model
 * @param {Object} params - The parameters for generation
 * @param {string} params.modelName - Model file to use for generation
 * @param {number} params.length - Maximum number of tokens to generate
 * @param {number} params.min_tokens - Minimum number of tokens to generate
 * @param {number} params.temperature - Randomness factor (0-2)
 * @param {string} params.prompt - Starting text for generation
 * @param {Array} params.stop - Stop tokens that end generation
 * @param {number} params.samples - Number of samples to generate
 * @param {boolean} params.allowRepetition - Allow immediate token repetition
 * @returns {Promise<Object>} - The result of the generation
 */
export async function generateText(params) {
  const {
    modelName,
    length = 100,
    temperature = 1.0,
    samples = 1,
    ...rest
  } = params || {};

  if (!modelName) {
    return {
      error: 'Generation failed: modelName is required',
      output: null,
    };
  }

  try {
    const serializer = new ModelSerializer();
    const model = await serializer.loadModel(modelName);

    const context = new GenerationContext({
      max_tokens: length,
      temperature: temperature,
      ...rest,
    });

    const results =
      samples === 1
        ? [model.generate(context)]
        : model.generateSamples(samples, context);

    const output = ['🎲 Generated text:', '─'.repeat(50)];
    results.forEach((result, i) => {
      if (result.error) {
        output.push(`❌ Sample ${i + 1}: ${result.error}`);
      } else {
        output.push(
          result.text,
          `(Length: ${result.length} tokens)`,
          '─'.repeat(50),
        );
        output.push(`(Finish reason: ${result.finish_reason})`);
      }
    });

    return { error: null, output: output.join('\n') };
  } catch (err) {
    return {
      error: `Generation failed: ${err.message}`,
      output: null,
    };
  }
}