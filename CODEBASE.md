# Codebase Structure

This document provides an overview of the file and folder structure of the Markov Chain Text Generator codebase.

## Folder Structure

The repository is organized into the following main directories:

-   `data/`: Contains corpus files for training models.
-   `examples/`: Contains sample usage scripts.
-   `src/`: Contains the main source code for the application.
-   `test/`: Contains tests for the application.

## File Structure and Exported Methods

### `src/cli/CLI.js`

This file contains the implementation of the command-line interface (CLI) for the application.

**Exported Classes:**

-   `MarkovCLI`: The main class for the CLI.
    -   `constructor()`
    -   `setupEventHandlers()`
    -   `displayWelcome()`
    -   `handleCommand(input)`
    -   `handleBuildDict(args)`
    -   `handleGenerate(args)`
    -   `handleSaveModel(args)`
    -   `handleLoadModel(args)`
    -   `handleStats()`
    -   `displayModelStats()`
    -   `start()`

### `src/cli/CommandParser.js`

This file contains the logic for parsing commands entered in the CLI.

**Exported Classes:**

-   `CommandParser`: A class for parsing commands.
    -   `constructor()`
    -   `parse(input)`
    -   `parseArguments(argsString)`
    -   `splitArguments(argsString)`
    -   `parseValue(value)`
    -   `getPositionalKey(index)`
    -   `validate(command, expectedSignatures)`
    -   `checkType(value, expectedType)`
    -   `getHelpText()`

### `src/core/MarkovModel.js`

This file defines the core `MarkovModel` class, which is responsible for building and managing the Markov chain.

**Exported Classes:**

-   `MarkovModel`: The main class for the Markov model.
    -   `constructor(options)`
    -   `train(tokens, options)`
    -   `getTransitions(state)`
    -   `sampleNextToken(state, randomFn)`
    -   `getRandomStartState(randomFn)`
    -   `getStats()`
    -   `toJSON()`
    -   `fromJSON(data)`
    -   `generate(options)`

### `src/core/TextGenerator.js`

This file contains the `TextGenerator` class, which uses a trained `MarkovModel` to generate new text.

**Exported Classes:**

-   `TextGenerator`: The main class for text generation.
    -   `constructor(model)`
    -   `generate(options)`
    -   `initializeState(startWith, randomFn)`
    -   `sampleNextToken(currentState, temperature, randomFn)`
    -   `updateState(currentState, newToken)`
    -   `postProcess(tokens, options)`
    -   `generateSamples(count, options)`
    -   `continueText(existingText, options)`
    -   `generateInteractive(options, feedbackFn)`

### `src/core/TextProcessor.js`

This file provides the `TextProcessor` class for cleaning and tokenizing text before it's used to train the model.

**Exported Classes:**

-   `TextProcessor`: The main class for text processing.
    -   `constructor()`
    -   `tokenize(text, options)`
    -   `tokenizeByWhitespace(text)`
    -   `tokenizeByWord(text, preservePunctuation)`
    -   `tokenizeBySentence(text)`
    -   `normalizeWhitespace(text)`
    -   `handlePunctuation(text, options)`
    -   `removePatterns(text, patterns, replacement)`
    -   `addSentenceBoundaries(tokens, startMarker, endMarker)`
    -   `isSentenceEnd(token)`
    -   `getTokenStats(tokens)`
    -   `createPipeline(filters)`

### `src/core/models/ModelInterface.js`

This file defines the `TextModel` interface that all models must implement.

**Exported Classes:**

-   `TextModel`: The base class for all models.
    -   `constructor(options)`
    -   `train(tokens)`
    -   `generate(options)`
    -   `toJSON()`
    -   `fromJSON(data)`
    -   `getStats()`

### `src/core/text/TokenizationService.js`

This file provides tokenization and normalization services.

**Exported Objects:**

-   `Tokenizers`: An object containing tokenization methods.
    -   `word(text)`
    -   `sentence(text)`
-   `Normalizers`: A class containing normalization methods.
    -   `whitespace(text)`

### `src/interfaces/core/AppInterface.js`

This file defines the `AppInterface` class, which provides a stateless interface to the application's core functionality.

**Exported Classes:**

-   `AppInterface`: The main class for the application interface.
    -   `constructor(model, generator)`
    -   `getStats()`

### `src/io/FileHandler.js`

This file contains the `FileHandler` class, which is responsible for all file I/O operations.

**Exported Classes:**

-   `FileHandler`: The main class for file handling.
    -   `constructor(options)`
    -   `readTextFile(filename)`
    -   `deleteModel(filename)`
    -   `getModelInfo(filename)`
    -   `exportModel(model, filename, format)`
    -   `exportToCSV(model, filename)`
    -   `exportToText(model, filename)`
    -   `writeTextFile(filename, content, options)`
    -   `listCorpusFiles()`
    -   `getFileInfo(filename)`
    -   `resolveCorpusPath(filename)`
    -   `resolveModelPath(filename)`
    -   `ensureDirectoryExists(dirPath)`
    -   `formatFileSize(bytes)`

### `src/io/ModelSerializer.js`

This file contains the `ModelSerializer` class, which is responsible for serializing and deserializing the `MarkovModel`.

**Exported Classes:**

-   `ModelSerializer`: The main class for model serialization.
    -   `constructor(options)`
    -   `saveModel(model, filename, options)`
    -   `loadModel(filename)`
    -   `validateModelData(modelData)`
    -   `listModels()`
    -   `deleteModel(filename)`
    -   `modelExists(filename)`
