# Markov Chain Text Generator

A modular, extensible Markov chain text generator with a clean CLI interface.

## Features

* **Configurable Order**: Support for different Markov chain orders (2, 3, 4+)
* **Flexible Input**: Process any plain text file as training corpus
* **Multiple Generation Modes**: Length-based, stop-condition, temperature control
* **Model Persistence**: Save and load trained models as JSON
* **Clean CLI**: REPL-style interface with function-like commands
* **Extensible Architecture**: Easy to add custom preprocessing and generation strategies

## Quick Start

1. **Add training text:**
   Place your text files in `data/corpus/` (e.g., `data/corpus/shakespeare.txt`)

2. **Start the CLI:**

   ```bash
   npm start
   ```

3. **Train and generate:**

   ```
   markov> train("shakespeare.txt", order=3)
   markov> generate(length=100)
   markov> save_model("shakespeare_model.json")
   ```

## CLI Commands

| Command                         | Description                | Example                                |
| ------------------------------- | -------------------------- | -------------------------------------- |
| `train(file, order)`            | Train model from text file | `train("corpus.txt", order=3)`         |
| `generate(length, temperature)` | Generate text              | `generate(length=50, temperature=0.8)` |
| `save_model(filename)`          | Save trained model         | `save_model("my_model.json")`          |
| `load_model(filename)`          | Load saved model           | `load_model("my_model.json")`          |
| `stats()`                       | Show model statistics      | `stats()`                              |
| `help()`                        | Show available commands    | `help()`                               |

## Programmatic Usage

```javascript
import { MarkovModel, Tokenizer, TextGenerator } from './src/index.js';

// Process text
const tokenizer = new Tokenizer();
const tokens = tokenizer.tokenize(text, { method: 'word' });

// Train model
const model = new MarkovModel({order:3});
model.train(tokens);

// Generate text
const generator = new TextGenerator(model);
const result = generator.generate({
    maxLength: 100,
    temperature: 1.0
});

console.log(result.text);
```

## Architecture

```
src/
├── core/
│   ├── MarkovModel.js      # Core Markov chain implementation
│   ├── Tokenizer.js        # Tokenization and preprocessing
│   └── TextGenerator.js    # Text generation algorithms
├── io/
│   ├── FileHandler.js      # File I/O operations
│   └── ModelSerializer.js  # Model persistence
├── cli/
│   ├── CLI.js              # Main CLI interface
│   └── CommandParser.js    # Command parsing utilities
└── utils/
    └── helpers.js          # Utility functions
```

## Examples

See `examples/sample_usage.js` for comprehensive usage examples:

```bash
node examples/sample_usage.js
```

## Configuration

The system uses sensible defaults but can be configured:

* **Corpus Directory**: `./data/corpus` (configurable)
* **Models Directory**: `./data/models` (configurable)
* **Default Order**: 2 (configurable per model)
* **File Encoding**: UTF-8
