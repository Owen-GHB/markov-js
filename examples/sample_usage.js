// examples/sample_usage.js

import { MarkovModel } from '../src/core/models/MarkovModel.js';
import { TextProcessor } from '../src/core/text/TextProcessor.js';
import { FileHandler } from '../src/io/FileHandler.js';
import { ModelSerializer } from '../src/io/ModelSerializer.js';

/**
 * Example usage of the Markov text generator
 * This demonstrates the programmatic API without the CLI
 */

async function basicExample() {
    console.log('🔗 Basic Markov Chain Example');
    console.log('===============================');

    // Sample text for training
    const sampleText = `
        The quick brown fox jumps over the lazy dog. 
        The lazy dog sleeps in the sun. 
        The brown fox runs through the forest. 
        A quick fox is clever and fast. 
        The dog barks at the clever fox.
        Quick animals are often clever animals.
        The forest is full of clever animals.
    `;

    // Initialize components
    const processor = new TextProcessor();
    const model = new MarkovModel({ order: 2 }); // Order 2

    // Tokenize and build model
    const tokens = processor.tokenize(sampleText, {
        method: 'word',
        preservePunctuation: true,
        preserveCase: false
    });

    console.log(`📝 Tokenized into ${tokens.length} tokens`);
    console.log(`🎯 Sample tokens: ${tokens.slice(0, 10).join(', ')}...`);

    model.train(tokens);
    console.log(`🔗 Built model with ${model.chains.size} states`);

    // Generate text
    console.log('\n🎲 Generating text...');
    for (let i = 0; i < 3; i++) {
        const result = model.generate({
            maxLength: 20,
            minLength: 10,
            temperature: 1.0
        });
        
        console.log(`${i + 1}. ${result.text}`);
    }
}

async function fileBasedExample() {
    console.log('\n📁 File-based Example');
    console.log('=====================');

    const fileHandler = new FileHandler();
    const processor = new TextProcessor();
    const serializer = new ModelSerializer();
	
	// Ensure models directory exists
    await fileHandler.ensureDirectoryExists(fileHandler.defaultModelDir);


    try {
        // This would read from data/corpus/sample.txt
        // For demo, we'll create sample content
        const sampleCorpus = `
            Once upon a time, in a faraway kingdom, there lived a brave knight.
            The knight was known for his courage and wisdom throughout the land.
            Every day, the knight would ride through the kingdom, helping those in need.
            The people of the kingdom loved their brave knight and told stories of his adventures.
            One day, a dragon appeared in the kingdom, causing great fear among the people.
            The brave knight knew he must face the dragon to protect his beloved kingdom.
            With his sword and shield, the knight rode out to meet the fearsome dragon.
            After a long battle, the knight defeated the dragon and saved the kingdom.
            The people celebrated their hero, and the knight became a legend in the land.
            Tales of the brave knight and the dragon were told for generations to come.
        `;

        console.log('📖 Processing corpus text...');
        const tokens = processor.tokenize(sampleCorpus, {
            method: 'word',
            preservePunctuation: true
        });

        // Try different orders
        for (const order of [2, 3]) {
            console.log(`\n🔗 Training model with order ${order}...`);
            
            const model = new MarkovModel({ order });
            model.train(tokens);
            
            const stats = model.getStats();
            
            console.log(`   States: ${stats.totalStates}`);
            console.log(`   Vocabulary: ${stats.vocabularySize}`);
            
            // Generate samples
            console.log(`📝 Generated text (order ${order}):`);
            const result = model.generate({
                maxLength: 30,
                temperature: 0.8
            });
            console.log(`   "${result.text}"`);
            
            // Save model for demo
            const modelFilename = `demo_model_order_${order}.json`;
            await serializer.saveModel(model, modelFilename);
            console.log(`💾 Saved model as ${modelFilename}`);
        }

    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
    }
}

async function advancedGenerationExample() {
    console.log('\n⚡ Advanced Generation Example');
    console.log('==============================');

    const corpus = `
        The sun rises in the eastern sky, painting clouds with golden light.
        Golden light streams through windows, warming the morning air.
        Morning air carries the scent of fresh flowers from the garden.
        The garden blooms with colors bright and beautiful in spring.
        Spring brings new life to every tree and flower in sight.
        Every tree stands tall against the clear blue summer sky.
        The summer sky holds promise of warm and pleasant days ahead.
        Days ahead are filled with joy and endless possibilities.
        Endless possibilities await those who dare to dream and explore.
        To explore the world is to discover beauty in unexpected places.
    `;

    const processor = new TextProcessor();
    const tokens = processor.tokenize(corpus);
    
    const model = new MarkovModel({ order: 3 });
    model.train(tokens);

    console.log('🎨 Experimenting with different generation parameters...\n');

    // Different temperatures
    console.log('🌡️ Temperature Effects:');
    for (const temp of [0.5, 1.0, 1.5]) {
        const result = model.generate({
            maxLength: 25,
            temperature: temp,
            minLength: 15
        });
        console.log(`   Temp ${temp}: "${result.text}"`);
    }

    // Starting with specific text
    console.log('\n🎯 Starting with specific text:');
    const continuation = model.generate({
        maxLength: 20,
        startWith: "The sun rises",
        temperature: 1.0
    });
    console.log(`   "${continuation.text}"`);

    // Multiple samples
    console.log('\n📊 Multiple samples:');
    const samples = model.generateSamples(3, {
        maxLength: 15,
        temperature: 1.2
    });
    
    samples.forEach((sample, i) => {
        console.log(`   ${i + 1}. "${sample.text}" (${sample.length} tokens)`);
    });
}

async function modelPersistenceExample() {
    console.log('\n💾 Model Persistence Example');
    console.log('=============================');

    const fileHandler = new FileHandler();
    const serializer = new ModelSerializer();
    const processor = new TextProcessor();

    // Ensure models directory exists
    await fileHandler.ensureDirectoryExists(fileHandler.defaultModelDir);

    // Create and train a model
    const text = "Hello world. World is beautiful. Beautiful world brings joy. Joy comes from beautiful things.";
    const tokens = processor.tokenize(text);
    
    const originalModel = new MarkovModel({ order: 2 });
    originalModel.train(tokens);
    
    console.log('💾 Saving model...');
    await serializer.saveModel(originalModel, 'persistence_test.json');
    
    console.log('📂 Loading model...');
    const loadedModel = await serializer.loadModel('persistence_test.json');
    
    console.log('🔍 Comparing original vs loaded model:');
    
    // Use same random seed for comparison
    const seed = 0.12345;
    const mockRandom = () => seed;
    
    const originalResult = originalModel.generate({
        maxLength: 10,
        randomFn: mockRandom
    });
    
    const loadedResult = loadedModel.generate({
        maxLength: 10,
        randomFn: mockRandom
    });
    
    console.log(`   Original: "${originalResult.text}"`);
    console.log(`   Loaded:   "${loadedResult.text}"`);
    console.log(`   Match: ${originalResult.text === loadedResult.text ? '✅' : '❌'}`);
}

// Main execution
async function runAllExamples() {
    try {
        await basicExample();
        await fileBasedExample();
        await advancedGenerationExample();
        await modelPersistenceExample();
        
        console.log('\n🎉 All examples completed successfully!');
        console.log('\nTo run the CLI interface, use:');
        console.log('  npm start');
        console.log('  # or');
        console.log('  node src/cli/CLI.js');
        
    } catch (error) {
        console.error(`❌ Example failed: ${error.message}`);
        console.error(error.stack);
    }
}

// Run examples and handle any uncaught errors
async function main() {
    try {
        await runAllExamples();
    } catch (err) {
        console.error('Error in examples:', err);
        process.exit(1);
    }
}


main();

export { runAllExamples };
