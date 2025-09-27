import { ModelSerializer } from '../../textgen/io/ModelSerializer.js';
import { GenerationContext } from '../../textgen/models/Interfaces.js';

export class GenerateHandler {
	constructor() {
		this.serializer = new ModelSerializer();
	}

	/**
	 * Handle the "generate" command
	 * @param {Object} params - The command parameters
	 * @returns {Promise<Object>} - The result of the generation
	 */
	async handleGenerate(params) {
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
			const model = await this.serializer.loadModel(modelName);

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
}
