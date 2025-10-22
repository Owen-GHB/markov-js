# Markov Chain Text Generator

A versatile text generation tool implementing Markov chains, Variable-Length Markov Models (VLMM), and Hidden Markov Models (HMM) with a command-line interface and multiple transport mechanisms.

This application is built using **Vertex**, a domain-agnostic command processing kernel that provides multiple interfaces (CLI, REPL, HTTP API, Web UI, and Electron desktop application) for any domain-specific commands.

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
vertex

# Command-line execution
vertex <command> [args...]

# Generate web UI
vertex --kernel generate

# Serve web UI and API (now serves both UI and API like old --serve)
vertex --kernel http

# Launch Electron application
vertex --kernel electron
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

| Command                             | Description                            | Example                                |
| ----------------------------------- | -------------------------------------- | -------------------------------------- |
| `pgb_download(id_or_title, [file])` | Download a book from Project Gutenberg | `pgb_download(1342, file="pride.txt")` |
| `pgb_info(id_or_title)`             | Get book details                       | `pgb_info("Pride and Prejudice")`      |
| `pgb_search(query)`                 | Search by title/author                 | `pgb_search("Sherlock Holmes")`        |

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
vertex train("sample.txt", "markov", order=3)

# Train a VLMM model with custom name
vertex train("poems.txt", "vlmm", modelName="poems_vlmm.json")
```

### Generating Text

```bash
# Basic generation
vertex generate("model.json")

# Generate with specific parameters
vertex generate("model.json", length=50, temperature=1.2)

# Generate with a prompt
vertex generate("model.json", prompt="The quick brown fox")
```

### Using the Web Interface

```bash
# Generate the web UI
vertex --kernel generate

# Serve both UI and API
vertex --kernel http

# Access at: http://localhost:8080/
```

### Using the Desktop Application

```bash
# Launch Electron application
vertex --kernel electron
```

### Using the HTTP Server

```bash
# Start HTTP server (serves both web UI and API)
vertex --kernel http

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
