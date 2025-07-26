# Markov Chain Text Generator

A versatile text generation tool implementing Markov chains, Variable-Length Markov Models (VLMM), and Hidden Markov Models (HMM) with a command-line interface.

---

## Features

### Multiple Model Types

* Standard Markov chains (n-gram)
* Variable-Length Markov Models (VLMM)
* Hidden Markov Models (HMM)

### Flexible Generation

* Temperature control for randomness
* Length constraints
* Prompt-based generation
* Multiple samples generation

### Command Line Interface

* Interactive REPL mode
* Multiple command syntax styles
* Tab completion

### Model Management

* Save/load trained models
* List available models
* Delete models
* Model statistics

---

## Installation

1. Ensure you have **Node.js (v14+)** installed.
2. Clone this repository.
3. Make the CLI executable:

```bash
chmod +x markov-cli.js
```

---

## Usage

### Running the CLI

```bash
./markov-cli.js
# or
node markov-cli.js
```

### Basic Commands

| Command                             | Description                 | Example                                  |
| ----------------------------------- | --------------------------- | ---------------------------------------- |
| `train(file, modelType, [options])` | Train a new model           | `train("sample.txt", "markov", order=3)` |
| `generate(model, [options])`        | Generate text from model    | `generate("model.json", length=50)`      |
| `listModels()`                      | List available models       | `listModels()`                           |
| `listCorpus()`                      | List available corpus files | `listCorpus()`                           |
| `delete("model.json")`              | Delete a model              | `delete("old_model.json")`               |
| `use("model.json")`                 | Set current model           | `use("model.json")`                      |
| `stats()`                           | Show model statistics       | `stats()`                                |
| `help()`                            | Show help                   | `help()`                                 |
| `exit`                              | Exit the CLI                | `exit`                                   |

---

## Command Syntax Styles

### Function Style

```javascript
train("sample.txt", "markov", order=3)
generate("model.json", length=50, temperature=1.2)
```

### Object Style

```javascript
train({ file: "sample.txt", modelType: "markov", order: 3 })
generate({ model: "model.json", length: 50 })
```

### Simple Style

```javascript
listModels()
exit
```

---

## Training Options

| Parameter   | Description                      | Default                      |
| ----------- | -------------------------------- | ---------------------------- |
| `file`      | Corpus file to train from        | **Required**                 |
| `modelType` | Type of model (`"markov"`, etc.) | **Required**                 |
| `order`     | Markov order (n-gram size)       | `2`                          |
| `modelName` | Custom filename to save as       | Derived from corpus filename |

---

## Generation Options

| Parameter     | Description                    | Default      |
| ------------- | ------------------------------ | ------------ |
| `model`       | Model file to use              | **Required** |
| `length`      | Max tokens to generate         | `100`        |
| `min_tokens`  | Minimum tokens to generate     | `10`         |
| `temperature` | Randomness factor (range: 0–2) | `1.0`        |
| `prompt`      | Starting text for generation   | None         |
| `samples`     | Number of samples to generate  | `1`          |

---

## Examples

### Training a Model

```javascript
// Train a 3rd-order Markov model
train("sample.txt", "markov", order=3)

// Train a VLMM model with custom name
train("poems.txt", "vlmm", modelName="poems_vlmm.json")
```

### Generating Text

```javascript
// Basic generation
generate("model.json")

// Generate with specific parameters
generate("model.json", length=50, temperature=1.2)

// Generate with a prompt
generate("model.json", prompt="The quick brown fox")
```

---

## Model Types

### Markov Chains

* Fixed-length n-gram models
* Fast training and generation
* Good for most general purposes

### Variable-Length Markov Models (VLMM)

* Adaptive context length
* More memory efficient for certain patterns
* Better for data with variable-length dependencies

### Hidden Markov Models (HMM)

* Models hidden states that emit observable tokens
* Supports Baum-Welch (EM) algorithm for unsupervised learning
* Includes Viterbi algorithm for most likely state sequence

---

## File Structure

```
data/
  corpus/      # Default location for text files
  models/      # Default location for saved models

src/
  entrypoints/ # CLI and API interfaces
  io/          # File handling and serialization
  models/      # Model implementations
  utils/       # Utility functions

examples/      # Example scripts
```
