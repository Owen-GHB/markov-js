# 🧠 Vertex Kernel Framework

A domain-agnostic command processing engine that automatically discovers and executes commands defined in your domain-specific contract, with support for multiple transports and built-in command types.

## 🎯 Purpose

Vertex provides a universal command processing system that works with any domain. Simply define your commands in a contract and the kernel automatically discovers, validates, and executes them through multiple interfaces.

## 📁 Project Structure

```
your-project/
├── kernel/                    # Generic command engine (copy once) - "Vertex"
│   ├── utils/                 # Shared utilities
│   ├── processor/             # Command processing pipeline
│   ├── app.js                 # REPL/CLI launcher
│   ├── kernel.js              # UI/Electron/HTTP launcher  
│   ├── contract.js            # Contract loading and validation
│   └── config.json            # Kernel configuration
├── external-plugins/          # Plugin directory (configurable)
│   ├── cli/                   # CLI interface
│   │   └── index.js           # CLI plugin implementation
│   ├── repl/                  # REPL interface  
│   ├── http/                  # HTTP server with UI+API
│   ├── electron/              # Electron desktop app
│   └── generate/              # UI generation system
├── contract.json              # Domain configuration
├── commands.json              # Command definitions
├── runtime.json               # Runtime behavior (optional)
├── help.json                  # User documentation (optional)
├── your-domain/               # Your domain-specific logic
└── main.js                    # Project entry point
```

## 🚀 Quick Start

### 1. Copy Vertex

Copy the entire `/kernel` directory to your project. This is the universal command engine - you never need to modify it.

### 2. Create Your Contract

Create these four files in your **project root** (not in a contract directory):

**contract.json**
```json
{
  "name": "your-app-name",
  "version": "1.0.0", 
  "description": "Your application description",
  "sources": {
    "yourDomain": "./your-domain/index.js"
  },
  "stateDefaults": {
    "currentUser": null,
    "currentProject": null
  }
}
```

**commands.json**
```json
{
  "yourcommand": {
    "commandType": "external-method",
    "source": "yourDomain",
    "methodName": "yourMethod",
    "description": "Description of what your command does",
    "parameters": {
      "param1": {
        "type": "string",
        "required": true,
        "description": "Required parameter"
      }
    }
  }
}
```

**runtime.json** (optional)
```json
{
  "yourcommand": {
    "sideEffects": {
      "setState": {
        "currentProject": {"fromParam": "param1"}
      }
    }
  }
}
```

**help.json** (optional)
```json
{
  "yourcommand": {
    "examples": [
      "yourcommand(param1=\"value\")",
      "yourcommand({param1: \"value\"})"
    ]
  }
}
```

### 3. Create Your Domain Code

**your-domain/index.js**
```javascript
export function yourMethod(args) {
  return `Processed: ${args.param1}`;
}
```

### 4. Create Entry Points

**main.js** (for REPL/CLI)
```javascript
#!/usr/bin/env node
import { launch } from './kernel/app.js';

const projectRoot = process.cwd();
launch(process.argv.slice(2), projectRoot);
```

**kernel-main.js** (for UI/Electron/HTTP)
```javascript
#!/usr/bin/env node  
import { launch } from './kernel/kernel.js';

const projectRoot = process.cwd();
launch(process.argv.slice(2), projectRoot);
```

### 5. Run Your Application

```bash
# REPL mode (interactive)
node main.js

# CLI mode  
node main.js yourcommand param1=value

# Generate web UI
node kernel-main.js --generate

# Serve web UI + API
node kernel-main.js --http

# Launch Electron app
node kernel-main.js --electron

# Show kernel help
node kernel-main.js
```

## 🧠 Command Types

### 1. External-Method Commands (`commandType: "external-method"`)

Automatically call methods from your domain code:

```json
{
  "name": "yourCommand",
  "commandType": "external-method", 
  "source": "yourDomain",
  "methodName": "yourMethod"
}
```

**Your domain method signature:**
```javascript
export function yourMethod(args) {
  // args contains parsed parameters
  return "Success result"; // Return value becomes command output
}
```

### 2. Internal Commands (`commandType: "internal"`)

Declarative commands handled by the kernel:

```json
{
  "name": "use",
  "commandType": "internal",
  "successOutput": "✅ Using: {{projectName}}",
  "parameters": {
    "projectName": {
      "type": "string", 
      "required": true
    }
  }
}
```

## 🔧 Configuration

**kernel/config.json**
```json
{
  "paths": {
    "pluginsDir": "external-plugins"
  }
}
```

## 📝 Command Syntax

All these work the same:

**Function style:**
```
yourcommand("value", key="option")
```

**Object style:**
```
yourcommand({param1: "value", key: "option"})  
```

**CLI style:**
```
yourcommand value key=option
```

**JSON style:**
```json
{"name": "yourcommand", "args": {"param1": "value"}}
```

## 🔌 Plugin System

Plugins are simple - just create a directory with `index.js`:

**external-plugins/your-plugin/index.js**
```javascript
export function start(config, commandProcessor) {
  // Your plugin logic
}

export function run(config, commandProcessor, args) {
  // Your plugin logic  
}
```

## 🎛️ Available Transports

### REPL Transport
Interactive shell with tab completion, history, and help:
```bash
node main.js
> help
> yourcommand param1=value
> exit
```

### CLI Transport  
Execute commands directly:
```bash
node main.js yourcommand param1=value
node main.js "yourcommand({param1: 'value'})"
```

### HTTP Transport
Web UI + REST API on port 8080:
```bash
node kernel-main.js --http
```
- UI: http://localhost:8080/
- API: http://localhost:8080/api
- Command via GET: `http://localhost:8080?json={"name":"command","args":{}}`

### Electron Transport
Desktop application:
```bash
node kernel-main.js --electron
```

### UI Generation
Generate web interface from your contract:
```bash
node kernel-main.js --generate
```

## ⚡ How It Works

### Command Processing Pipeline:
1. **Parse**: Convert input string to command object
2. **Validate**: Check parameters against manifest  
3. **Execute**: Route to appropriate handler based on `commandType`
4. **Apply Side Effects**: Update state if command succeeds

### Automatic Source Resolution:
- External methods are loaded from sources defined in `contract.json`
- Modules are cached for performance
- Supports both local files and npm packages

### State Management:
- Persistent state saved to context file
- Automatic fallbacks: `runtimeFallback: "currentProject"`
- Template rendering: `{{paramName}}` in success messages

## 🛠️ Advanced Features

### Parameter Validation
```json
{
  "amount": {
    "type": "integer|number",
    "required": true,
    "min": 0,
    "max": 100,
    "description": "Amount between 0-100"
  },
  "mode": {
    "type": "string", 
    "enum": ["fast", "slow", "auto"],
    "default": "auto"
  }
}
```

### Runtime Fallbacks
```json
{
  "projectName": {
    "type": "string",
    "required": true, 
    "runtimeFallback": "currentProject"
  }
}
```

### Template Outputs
```json
{
  "successOutput": "Processed {{fileName}} in {{mode}} mode",
  "sideEffects": {
    "setState": {
      "lastFile": {"fromParam": "fileName"},
      "outputPath": {"template": "output/{{fileName}}.json"}
    }
  }
}
```
