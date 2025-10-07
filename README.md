# Markov Chain Text Generator

A versatile text generation tool implementing Markov chains, Variable-Length Markov Models (VLMM), and Hidden Markov Models (HMM) with a command-line interface and multiple transport mechanisms.

---

## 🧠 Architecture Overview

This application follows a **modular kernel architecture** with clean separation of concerns. The architecture cleanly separates:

- **Application Domain** (`textgen/`) - Core text generation logic
- **Interface Domain** (`kernel/plugins/`) - Multiple access methods (CLI, HTTP, Electron, Generator)
- **Contract System** (`contract/`) - Command definitions and manifests
- **Kernel Core** (`kernel/`) - Command orchestration and processing

### Command Types

The system supports three distinct command handling strategies:

1. **External-Method Commands** (`train`, `generate`, etc.) - Automatically call domain methods
2. **Internal Commands** (`use`, etc.) - Declarative state manipulation (no handler files needed)
3. **Custom Commands** (`randomize`) - Special business logic requiring custom handlers

### Transport System

Commands work seamlessly across multiple interfaces:
- **CLI** - Direct command-line execution
- **REPL** - Interactive shell with tab completion
- **HTTP API** - RESTful web API
- **HTTP Serve** - Web server with UI and API
- **Electron** - Desktop application

## 🧱 Kernel Architecture

### Kernel Architecture

The kernel provides a robust foundation that includes:

1. **Universal Command Processing** - Works with any domain by defining commands in contracts
2. **Multiple Transport Mechanisms** - CLI, REPL, HTTP API, HTTP Serve, Electron
3. **Automatic Command Discovery** - Scans contract directory and discovers all commands
4. **Declarative Configuration** - Commands defined entirely in JSON manifests
5. **State Management** - Persistent state that survives across command invocations
6. **Runtime Fallbacks** - Parameters automatically fall back to state values
7. **Template Strings** - Dynamic values in side effects using template substitution
8. **Cross-Platform UI** - Automatically generates web interfaces from contracts

### Command Types

The system supports three distinct command handling strategies:

1. **External-Method Commands** (`train`, `generate`, etc.)
   - Automatically delegate to domain methods
   - No handler files needed
   - Defined with `commandType: "external-method"` in manifests

2. **Internal Commands** (`use`, etc.)
   - Pure state manipulation
   - No handler files needed
   - Behavior defined entirely in manifests
   - Defined with `commandType: "internal"` in manifests

3. **Custom Commands** (`randomize`, etc.)
   - Special business logic requiring custom implementation
   - Require handler files
   - Defined with `commandType: "custom"` in manifests

### Transport System

Commands work seamlessly across multiple interfaces:

- **CLI** - Direct command-line execution (`node main.js command()`)
- **REPL** - Interactive shell with tab completion (`node main.js`)
- **HTTP API** - RESTful web API (`node main.js --http=8080`)
- **HTTP Serve** - Web server with UI and API (`node main.js --serve=8080`)
- **Electron** - Desktop application (`node main.js --electron`)


---

---

## Features

### Multiple Model Types

- Standard Markov chains (n-gram)
- Variable-Length Markov Models (VLMM)
- Hidden Markov Models (HMM)

### Flexible Generation

- Temperature control for randomness
- Length constraints
- Prompt-based generation
- Multiple samples generation

### Command Line Interface

- Interactive REPL mode
- Multiple command syntax styles
- Tab completion

### Model Management

- Save/load trained models
- List available models
- Delete models
- Model statistics

---

## Installation

1. Ensure you have **Node.js (v14+)** installed.
2. Clone this repository.
3. Install dependencies:

```bash
npm install
```

4. (Optional) Install Electron for desktop UI:

```bash
npm install --save-dev electron
```

---

## Usage

### Running the Application

```bash
# Direct execution (REPL mode)
node main.js

# Command-line execution
node main.js <command> [args...]

# Generate web UI
node main.js --generate

# Serve web UI and API
node main.js --serve[=port]

# HTTP API only
node main.js --http[=port]

# Launch Electron application
node main.js --electron
```

### Basic Commands

| Command                             | Description                 | Example                                  |
| ----------------------------------- | --------------------------- | ---------------------------------------- |
| `train(file, modelType, [options])` | Train a new model           | `train("sample.txt", "markov", order=3)` |
| `generate(modelName, [options])`    | Generate text from model    | `generate("model.json", length=50)`      |
| `listModels()`                      | List available models       | `listModels()`                           |
| `listCorpus()`                      | List available corpus files | `listCorpus()`                           |
| `delete("model.json")`              | Delete a model              | `delete("old_model.json")`               |
| `use("model.json")`                 | Set current model           | `use("model.json")`                      |
| `help()`                            | Show help                   | `help()`                                 |
| `exit()`                            | Exit the program            | `exit()`                                 |

### Project Gutenberg Commands

| Command                             | Description                           | Example                                |
| ----------------------------------- | ------------------------------------- | -------------------------------------- |
| `pgb_download(id_or_title, [file])` | Download a book from Project Gutenberg | `pgb_download(1342, file="pride.txt")` |
| `pgb_info(id_or_title)`             | Get book details                      | `pgb_info("Pride and Prejudice")`      |
| `pgb_search(query)`                 | Search by title/author                | `pgb_search("Sherlock Holmes")`        |

| Command                             | Description                 | Example                                  |
| ----------------------------------- | --------------------------- | ---------------------------------------- |
| `train(file, modelType, [options])` | Train a new model           | `train("sample.txt", "markov", order=3)` |
| `generate(model, [options])`        | Generate text from model    | `generate("model.json", length=50)`      |
| `listModels()`                      | List available models       | `listModels()`                           |
| `listCorpus()`                      | List available corpus files | `listCorpus()`                           |
| `delete("model.json")`              | Delete a model              | `delete("old_model.json")`               |
| `use("model.json")`                 | Set current model           | `use("model.json")`                      |
| `help()`                            | Show help                   | `help()`                                 |
| `exit`                              | Exit the CLI                | `exit`                                   |

---

## Command Syntax Styles

### Function Style

```javascript
train('sample.txt', 'markov', (order = 3));
generate('model.json', (length = 50), (temperature = 1.2));
```

### Object Style

```javascript
train({ file: 'sample.txt', modelType: 'markov', order: 3 });
generate({ model: 'model.json', length: 50 });
```

### Simple Style

```javascript
listModels();
exit;
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

```bash
# Train a 3rd-order Markov model
node main.js train("sample.txt", "markov", order=3)

# Train a VLMM model with custom name
node main.js train("poems.txt", "vlmm", modelName="poems_vlmm.json")
```

### Generating Text

```bash
# Basic generation
node main.js generate("model.json")

# Generate with specific parameters
node main.js generate("model.json", length=50, temperature=1.2)

# Generate with a prompt
node main.js generate("model.json", prompt="The quick brown fox")
```

### Using the Web Interface

```bash
# Generate the web UI
node main.js --generate

# Serve both UI and API
node main.js --serve=8080

# Access at: http://localhost:8080/
```

### Using the Desktop Application

```bash
# Launch Electron application
node main.js --electron
```

### Using the HTTP API

```bash
# Start HTTP API server
node main.js --http=8080

# Call API with JSON command
curl -X POST http://localhost:8080/api \
  -H "Content-Type: application/json" \
  -d '{"json":"{\"name\":\"generate\",\"args\":{\"modelName\":\"model.json\",\"length\":50}}"}'
```

---

## Model Types

### Markov Chains

- Fixed-length n-gram models
- Fast training and generation
- Good for most general purposes

### Variable-Length Markov Models (VLMM)

- Adaptive context length
- More memory efficient for certain patterns
- Better for data with variable-length dependencies

### Hidden Markov Models (HMM)

- Models hidden states that emit observable tokens
- Supports Baum-Welch (EM) algorithm for unsupervised learning
- Includes Viterbi algorithm for most likely state sequence

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
