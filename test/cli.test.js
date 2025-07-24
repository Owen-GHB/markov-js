import { MarkovCLI } from '../src/cli/CLI.js';
import { MarkovModel } from '../src/core/MarkovModel.js';
import { TextGenerator } from '../src/core/TextGenerator.js';
import { FileHandler } from '../src/io/FileHandler.js';
import assert from 'assert';

async function testCli() {
    console.log('🧪 Running CLI test...');

    // Create a mock CLI instance
    const cli = new MarkovCLI(null, null);

    // Create a sample corpus file
    const fileHandler = new FileHandler();
    const corpusPath = 'data/corpus/test_corpus.txt';
    const corpusContent = 'a b c a b c';
    await fileHandler.ensureDirectoryExists('data/corpus');
    await fileHandler.writeTextFile(corpusPath, corpusContent);

    // Test build_dict
    const { model, generator } = await cli.handleBuildDict({ filename: corpusPath, order: 2 });
    cli.model = model;
    cli.generator = generator;

    assert(cli.model instanceof MarkovModel, 'Model should be a MarkovModel instance');
    assert(cli.generator instanceof TextGenerator, 'Generator should be a TextGenerator instance');
    assert.strictEqual(cli.model.order, 2, 'Model order should be 2');

    console.log('✅ build_dict command test passed');

    // Test generate
    const result = cli.generator.generate({ maxLength: 5 });
    assert(result.text.length > 0, 'Generated text should not be empty');

    console.log('✅ generate command test passed');

    // Test save_model and load_model
    const modelPath = 'test_model.json';
    await cli.handleSaveModel({ filename: modelPath });

    const loadedCli = new MarkovCLI(null, null);
    await loadedCli.handleLoadModel({ filename: modelPath });

    assert(loadedCli.model instanceof MarkovModel, 'Loaded model should be a MarkovModel instance');
    assert.strictEqual(loadedCli.model.order, 2, 'Loaded model order should be 2');

    console.log('✅ save_model and load_model commands test passed');

    console.log('🎉 CLI test completed successfully!');
}

testCli().catch(err => {
    console.error('❌ CLI test failed:', err);
    process.exit(1);
});
