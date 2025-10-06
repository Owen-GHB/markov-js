# Manifest Definition and Guide

## Overview
Manifests are the core of the Markov-js kernel architecture, defining how commands are processed, validated, and executed. Each command is defined through a JSON manifest file that declares its parameters, behavior, and side effects.

## Global Manifest vs Command Manifests

There are two types of manifest files in the system:
1. **Global manifest** (`contract/global.json`) - Defines application-wide configuration
2. **Command manifests** (`contract/[command-name]/manifest.json`) - Defines individual command behavior

## Global Manifest Properties

### Required Properties
- `name` (string): The application name
- `version` (string): The application version
- `description` (string): Human-readable description of the application

### Optional Properties
- `prompt` (string): The REPL prompt string
- `stateDefaults` (object): Default values for application state

Example:
```json
{
  "name": "your-app-name",
  "version": "1.0.0",
  "description": "A description of your application",
  "prompt": "app> ",
  "stateDefaults": {
    "currentUser": null,
    "defaultFile": "default.txt"
  },


}
```

## Command Manifest Properties

### Required Properties
- `name` (string): The unique command identifier
- `commandType` (string): How the command is processed; one of:
  - `"external-method"`: Delegates to an external domain method
  - `"internal"`: Pure state manipulation defined in the manifest
  - `"custom"`: Requires a custom handler implementation
- `description` (string): Human-readable command description
- `parameters` (array): Array of parameter definitions (can be empty)

### Optional Properties
- `syntax` (string): Command usage syntax (e.g., `"myCommand(param1, [options])"`)
- `examples` (array): Usage examples for documentation
- `sideEffects` (object): State changes that occur after command execution

### Conditionally Required Properties

#### For "external-method" commands:
- `modulePath` (string): Path to the external module that contains the method to execute (resolved to absolute path at load time)
- `methodName` (string): Name of the method in the external module to execute

#### For "internal" commands:
- `successOutput` (string): Output template for user feedback (recommended)

## Parameter Properties

### Required Properties
- `name` (string): Parameter identifier
- `type` (string): Data type; one of:
  - `"string"`, `"integer"`, `"number"`, `"boolean"`, `"array"`
  - Union types using `|` (e.g., `"string|integer"`)
- `required` (boolean): Whether the parameter is mandatory

### Optional Properties
- `default` (any): Default value when parameter is not provided
- `description` (string): Human-readable parameter description
- `runtimeFallback` (string): Name of a state key to use as fallback if parameter not provided
- `enum` (array): Array of allowed values for validation
- `min` (number): Minimum value for numeric types
- `max` (number): Maximum value for numeric types
- `kind` (string): Additional metadata (e.g., `"implicit"` for parameters handled automatically)
- `transform` (object): Rules for transforming values for complex inputs

## Side Effects Properties

Commands can define side effects that modify the application state after successful execution:

- `setState` (object): Updates specific state keys with values from parameters or templates
- `clearState` (array): State keys to remove after execution
- `clearStateIf` (object): Conditionally removes state keys based on parameter values

## Example Command Manifest

### External Method Command
```json
{
  "name": "process",
  "commandType": "external-method",
  "modulePath": "yourDomain/index.js",
  "methodName": "yourMethod",
  "description": "Process data using your method",
  "syntax": "process(input, type, [options])",
  "parameters": [
    {
      "name": "input",
      "type": "string",
      "required": true,
      "description": "Input data to process",
      "runtimeFallback": "defaultFile"
    },
    {
      "name": "type",
      "type": "string",
      "required": true,
      "enum": ["typeA", "typeB", "typeC"],
      "description": "Processing type to use"
    }
  ],
  "sideEffects": {
    "setState": {
      "lastProcessed": {
        "fromParam": "input",
        "template": "{{input | basename}}"
      }
    }
  },
  "examples": [
    "process(\"data.txt\", \"typeA\", option1=value1)",
    "process({input: \"input.txt\", type: \"typeB\", option1: \"value\"})"
  ]
}
```

Note: The `modulePath` is resolved to an absolute path at contract loading time, eliminating the need for runtime path resolution during command execution.

### Internal Command
```json
{
  "name": "set",
  "commandType": "internal",
  "description": "Set a configuration value",
  "syntax": "set(key, value)",
  "parameters": [
    {
      "name": "key",
      "type": "string",
      "required": true,
      "description": "Configuration key to set"
    },
    {
      "name": "value",
      "type": "string",
      "required": true,
      "description": "Value to assign to the key"
    }
  ],
  "sideEffects": {
    "setState": {
      "currentConfig": { "fromParam": "value" }
    }
  },
  "successOutput": "✅ Set {{key}} to {{value}}",
  "examples": ["set(\"theme\", \"dark\")"]
}
```

### Custom Command
```json
{
  "name": "complex",
  "commandType": "custom",
  "description": "A complex operation requiring custom logic",
  "syntax": "complex([options])",
  "parameters": [
    {
      "name": "verbose",
      "type": "boolean",
      "required": false,
      "default": false,
      "description": "Enable verbose output"
    }
  ],
  "examples": ["complex()", "complex(verbose=true)"]
}
```

## Writing Your Own Manifest

To create a new command:

1. Create a new directory in `contract/[command-name]/`
2. Create a `manifest.json` file in this directory
3. Define the required properties (`name`, `commandType`, `description`, `parameters`)
4. Add optional properties as needed
5. If `commandType` is `"external-method"`, include `modulePath` and `methodName`
6. If `commandType` is `"custom"`, make sure to also create a `handler.js` file in the same directory

The kernel will automatically discover and integrate your command based on the manifest definition. Custom handlers are loaded on-demand by the CommandHandler component.