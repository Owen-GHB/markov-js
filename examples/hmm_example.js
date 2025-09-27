import { HMModel } from '../textgen/models/HMM/Model.js';
import { Tokenizer } from '../textgen/models/Tokenizer.js';
import { GenerationContext } from '../textgen/models/Interfaces.js';

async function hmmExample() {
	console.log('\n🔮 Hidden Markov Model Example');
	console.log('==============================');

	const text = `Once upon a time, in a faraway kingdom, there lived a brave knight.
            The knight was known for his courage and wisdom throughout the land.
            Every day, the knight would ride through the kingdom, helping those in need.
            The people of the kingdom loved their brave knight and told stories of his adventures.
            One day, a dragon appeared in the kingdom, causing great fear among the people.
            The brave knight knew he must face the dragon to protect his beloved kingdom.
            With his sword and shield, the knight rode out to meet the fearsome dragon.
            After a long battle, the knight defeated the dragon and saved the kingdom.
            The people celebrated their hero, and the knight became a legend in the land.
            Tales of the brave knight and the dragon were told for generations to come.`;

	const processor = new Tokenizer();
	const tokens = processor.tokenize(text);

	const model = new HMModel({ numStates: 5 });
	model.train(tokens, { verbose: true });

	console.log('\n🎲 Generating text...');
	const context = new GenerationContext({ max_tokens: 20 });
	const result = model.generate(context);
	console.log(result.text);

	// Get most likely state sequence for input
	const stateSequence = model.viterbi(tokens);
	console.log('\nState sequence for input:');
	console.log(stateSequence);
}

hmmExample();
