# 🧠 Message-Passing Kernel Framework

A generic, domain-agnostic command processing engine that automatically discovers and executes commands defined in your domain-specific contract.

## 🎯 Purpose

This kernel provides a universal command processing system that works with any domain. Simply define your commands in a contract folder and the kernel automatically discovers, validates, and executes them through multiple interfaces.

## 📁 Project Structure

```
your-project/
├── kernel/           # This generic command engine (copy once)
├── contract/         # Your domain-specific commands (write for each project)
│   ├── global.json   # Domain configuration (prompt, defaults, etc.)
│   ├── command1/     # Directory for each command
│   │   ├── handler.js    # Command implementation
│   │   └── manifest.json # Command definition
│   └── command2/
│       ├── handler.js
│       └── manifest.json
└── main.js           # Your project's entry point (see below)
```

## 🚀 Quick Start

### 1. Copy the Kernel
Copy the entire `/kernel` directory to your project. This is the universal command engine - you never need to modify it.

### 2. Create Your Contract
Create a `/contract` directory with your domain-specific commands:

**contract/global.json**
```json
{
  "name": "your-app-name",
  "version": "1.0.0", 
  "description": "Your application description",
  "prompt": "> ",
  "stateDefaults": {
    "currentUser": null,
    "currentProject": null
  }
}
```

**contract/yourcommand/handler.js**
```javascript
/**
 * Handle the "yourcommand" command
 * @param {Object} params - Command parameters
 * @returns {Object} - Result with error/output
 */
export default async function handleYourcommand(params) {
  // Your command implementation here
  return {
    error: null,
    output: "Command executed successfully!"
  };
}
```

**contract/yourcommand/manifest.json**
```json
{
  "name": "yourcommand",
  "description": "Description of what your command does",
  "syntax": "yourcommand(param1, [options])",
  "parameters": [
    {
      "name": "param1",
      "type": "string",
      "required": true,
      "description": "Required parameter"
    }
  ]
}
```

### 3. Create Your Entry Point
Create a `main.js` file at your project root:

```javascript
#!/usr/bin/env node

// Check if we're being called directly with command line args
if (process.argv.length > 2) {
  import('./kernel/transports/CLI.js')
    .then(({ CLI }) => {
      const cli = new CLI();
      cli.run(process.argv.slice(2));
    })
    .catch((err) => {
      console.error('❌ Failed to load CLI:', err.message);
      process.exit(1);
    });
} else {
  // Default to REPL mode if no args
  import('./kernel/transports/REPL.js')
    .then(async ({ REPL }) => {
      const repl = new REPL();
      await repl.start();
    })
    .catch((err) => {
      console.error('❌ Failed to start REPL:', err.message);
      process.exit(1);
    });
}
```

### 4. Run Your Application
```bash
# CLI mode
node main.js yourcommand param1=value1

# REPL mode  
node main.js
> yourcommand param1=value1
```

## 🧠 Advanced Features

### State Management
The kernel provides persistent state management that persists across command invocations:

```javascript
// In global.json
{
  "stateDefaults": {
    "currentUser": null,
    "currentProject": null,
    "lastResult": null
  }
}

// In command manifest
{
  "sideEffects": {
    "setState": {
      "currentProject": { "fromParam": "projectName" },
      "lastResult": { "template": "Processed {{fileName}}" }
    }
  }
}
```

### Context Passing
Commands receive contextual information automatically:
```javascript
export default async function handleCommand(params, context) {
  const { state, manifest } = context;
  const currentUser = state.get('currentUser');
  // Use context for decisions
}
```

### Runtime Fallbacks
Parameters can automatically fall back to state values:
```json
{
  "parameters": [
    {
      "name": "projectName",
      "type": "string", 
      "required": true,
      "runtimeFallback": "currentProject"
    }
  ]
}
```

### Template Strings
Use template strings for dynamic values in side effects:
```json
{
  "sideEffects": {
    "setState": {
      "currentProject": { "fromParam": "projectName" },
      "projectFile": { "template": "{{projectName}}.json" }
    }
  }
}
```

## 🧩 How It Works

### Automatic Command Discovery
The kernel automatically scans your `/contract` directory at startup and discovers all commands by reading their `manifest.json` files. No configuration needed!

### Universal Handler Interface
All command handlers follow the same simple pattern:
```javascript
export default async function handleCommandname(params) {
  // Implementation
  return { error: null, output: "Result" };
}
```

### Multiple Transports
The same commands work through multiple interfaces:
- **CLI** - Command-line arguments (`yourcommand param=value`)
- **REPL** - Interactive shell with command completion
- **JSON** - Programmatic JSON interface

### Zero Coupling
The kernel contains zero domain-specific logic. All domain configuration lives in your `/contract` folder.

## 🛠️ Command Handler Development

### Handler Structure
Each handler must:
1. Be in its own directory under `/contract/commandname/`
2. Export its main function as `default`
3. Return `{ error: string|null, output: string|null }`
4. Follow the parameter specification in its manifest

### Example Handler
```javascript
export default async function handleExample(params) {
  const { requiredParam, optionalParam = "default" } = params || {};
  
  if (!requiredParam) {
    return {
      error: "requiredParam is required",
      output: null
    };
  }
  
  try {
    // Your implementation here
    const result = `Processed ${requiredParam} with ${optionalParam}`;
    
    return {
      error: null,
      output: result
    };
  } catch (error) {
    return {
      error: `Processing failed: ${error.message}`,
      output: null
    };
  }
}
```

## 📋 Manifest Schema

Each command must provide a `manifest.json` that defines:
- Command name and description
- Parameter specifications with types and validation
- Syntax examples and usage information
- Side effects and state management rules

The kernel uses these manifests for automatic parameter validation, help text generation, and command completion.

## 🔄 Extensibility

The kernel is designed for extension:
- Add new transports by implementing the same interface
- Extend functionality through the contract manifest system
- Customize behavior through domain-specific configuration
- Maintain backward compatibility while evolving features

Just copy the kernel once and focus on writing your domain-specific commands!