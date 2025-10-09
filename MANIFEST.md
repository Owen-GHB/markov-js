# Contract Manifest System

The Vertex kernel uses a three-file separation to organize command definitions with clear separation of concerns:

## Three-File Contract Structure

Each command is defined by three JSON files in its dedicated directory:

1. **`manifest.json`** - Core kernel requirements
2. **`runtime.json`** - Runtime behavior and logic features
3. **`help.json`** - User documentation and examples

## File Structure

```
contract/
├── global.json              # Application-wide configuration
├── [command-name]/
│   ├── manifest.json       # Kernel requirements only
│   ├── runtime.json        # Runtime features and logic
│   └── help.json           # User documentation
└── ...
```

## manifest.json - Core Kernel Requirements

Contains only the essential information the kernel needs to register and route the command:

```json
{
	"name": "train",
	"commandType": "external-method",
	"modulePath": "textgen/index.js",
	"methodName": "trainModel",
	"parameters": {
		"file": {
			"type": "string",
			"required": true
		},
		"modelType": {
			"type": "string",
			"required": true
		}
	}
}
```

**Purpose**: Define the minimal requirements for kernel operation:

- Command identity (`name`, `commandType`)
- Execution details (`modulePath`, `methodName`)
- Parameter structure (`type`, `required`)

## runtime.json - Runtime Behavior

Contains features that affect command execution at runtime:

```json
{
	"sideEffects": {
		"setState": {
			"currentModel": {
				"fromParam": "modelName",
				"template": "{{file | basename}}.json"
			}
		}
	},
	"parameters": {
		"file": {
			"runtimeFallback": "defaultCorpus"
		},
		"modelType": {
			"enum": ["markov", "vlmm", "hmm"]
		},
		"order": {
			"default": 2,
			"min": 1,
			"max": 10
		},
		"modelName": {
			"kind": "implicit"
		},
		"caseSensitive": {
			"default": false
		},
		"trackStartStates": {
			"default": true
		}
	}
}
```

**Purpose**: Define runtime behavior and application logic:

- Side effects (`sideEffects`, `setState`, `clearStateIf`)
- Parameter defaults and constraints (`default`, `min`, `max`, `enum`)
- Runtime features (`runtimeFallback`, `kind`, `transform`)
- Success output formatting (`successOutput`)

## help.json - User Documentation

Contains all user-facing documentation:

```json
{
	"description": "Train a model from a text corpus file",
	"syntax": "train(file, modelType, [options])",
	"examples": [
		"train(\"sample.txt\", \"markov\", order=2)",
		"train({file: \"corpus.txt\", modelType: \"vlmm\", order: 3})"
	],
	"parameters": {
		"file": {
			"description": "Corpus file to train from"
		},
		"modelType": {
			"description": "Type of model to train"
		},
		"order": {
			"description": "Markov order (n-gram size)"
		},
		"modelName": {
			"description": "Filename to save the trained model"
		},
		"caseSensitive": {
			"description": "Whether to preserve case during tokenization"
		},
		"trackStartStates": {
			"description": "Whether to track sentence start states"
		}
	}
}
```

**Purpose**: Provide user-facing documentation:

- Command descriptions (`description`, `syntax`)
- Usage examples (`examples`)
- Parameter documentation (`description`)
- Help text formatting

## Parameter Structure

All three files use the same parameter object structure where each parameter is keyed by its name:

```json
// Use objects keyed by parameter name:
{
	"parameters": {
		"file": { "type": "string", "required": true },
		"modelType": { "type": "string", "required": true }
	}
}
```

This structure enables clean merging of the three files while preserving parameter identity.

## File Merging Process

The kernel automatically merges the three files using these precedence rules:

1. **Base structure** from `manifest.json`
2. **Runtime features** merged from `runtime.json`
3. **Documentation** merged from `help.json`

All parameter objects are deep-merged, so properties from all three files are combined for each parameter.

## Best Practices

### manifest.json Guidelines

- Keep minimal and kernel-focused
- Only include what's required for basic command registration
- Focus on structural information (`type`, `required`)

### runtime.json Guidelines

- Include all execution-time features
- Add defaults, constraints, and validation rules
- Define side effects and state management
- Keep parameter structure aligned with manifest.json

### help.json Guidelines

- Focus exclusively on user documentation
- Provide clear, descriptive text
- Include comprehensive examples
- Keep parameter structure aligned with other files

### Consistency Across Files

- Use identical parameter names across all three files
- Maintain consistent parameter ordering
- Document the same parameters in all relevant files
- Follow the same naming conventions
