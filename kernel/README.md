# 🧠 Message-Passing Kernel Framework

A generic, domain-agnostic command processing engine that automatically discovers and executes commands defined in your domain-specific contract, with support for multiple transports and built-in command types.

## 🎯 Purpose

This kernel provides a universal command processing system that works with any domain. Simply define your commands in a contract folder and the kernel automatically discovers, validates, and executes them through multiple interfaces.

## 📁 Modern Project Structure

```
your-project/
├── kernel/                    # Generic command engine (copy once)
│   ├── transports/           # Interface-specific implementations
│   │   ├── stdio/           # CLI and REPL interfaces
│   │   ├── http/            # HTTP server and API
│   │   ├── electron/        # Electron desktop application
│   │   └── native/          # Direct programmatic API
│   ├── generator/            # UI generation system
│   ├── utils/               # Shared utilities
│   ├── contract.js          # Contract loading and management
│   └── CommandHandler.js    # Core command processing
├── contract/                # Your domain-specific commands (write for each project)
│   ├── global.json          # Domain configuration (prompt, defaults, etc.)
│   ├── command1/            # Directory for each command
│   │   ├── handler.js       # Custom command implementation (optional)
│   │   └── manifest.json    # Command definition
│   └── command2/
│       ├── handler.js
│       └── manifest.json
├── textgen/                 # Domain-specific logic (e.g., text generation)
├── generated-ui/            # Auto-generated web interface
└── main.js                  # Your project's entry point
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

**contract/yourcommand/manifest.json**
```json
{
  "name": "yourcommand",
  "commandType": "external-method",
  "modulePath": "textgen/index.js",
  "methodName": "yourDomainMethod",
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
import { launch } from './kernel/main.js';

// Launch with current directory as project root
const projectRoot = process.cwd();
launch(process.argv.slice(2), projectRoot);
```

### 4. Run Your Application
```bash
# CLI mode
node main.js yourcommand param1=value1

# REPL mode  
node main.js

# Generate web UI
node main.js --generate

# Serve web UI and API
node main.js --serve=3000

# Launch Electron app
node main.js --electron
```

## 🧠 Command Types

The kernel supports three distinct command types with different handling strategies:

### 1. External-Method Commands (`commandType: "external-method"`)
Automatically handled by calling domain methods:
```json
{
  "name": "train",
  "commandType": "external-method",
  "modulePath": "textgen/index.js",
  "methodName": "trainModel"
}
```
No handler file needed - the kernel automatically calls `textgen.trainModel()`.

### 2. Internal Commands (`commandType: "internal"`) 
Handled declaratively with template-based output:
```json
{
  "name": "use",
  "commandType": "internal",
  "successOutput": "✅ Using model: {{modelName}}",
  "parameters": [...]
}
```
No handler file needed - behavior defined entirely in manifest.

### 3. Custom Commands (`commandType: "custom"`)
Require custom handler implementation:
```json
{
  "name": "randomize",
  "commandType": "custom"
}
```
Must provide `handler.js` with custom logic.

## 🔄 Transport System

The kernel provides multiple interfaces to access your commands:

### CLI Transport
Execute commands directly from the command line:
```bash
node main.js yourcommand param=value
```

### REPL Transport  
Interactive shell with tab completion:
```bash
node main.js
> yourcommand param=value
```

### HTTP Transport
RESTful API server with JSON endpoints:
```bash
# Start API server
node main.js --http=8080

# Make API calls
GET http://localhost:8080?json={"name":"yourcommand","args":{"param":"value"}}
POST http://localhost:8080 with JSON body
```

### HTTP Serve Transport
HTTP server serving both web UI and API:
```bash
# Start server with UI and API
node main.js --serve=3000

# UI available at: http://localhost:3000/
# API available at: http://localhost:3000/api
```

### Electron Transport
Desktop application with native UI:
```bash
# Launch Electron app
node main.js --electron
```

### Native Transport
Direct programmatic API access:
```javascript
import { JSONAPI } from './kernel/transports/native/JSON.js';
const api = new JSONAPI();
const result = await api.handleInput('{"name":"yourcommand","args":{"param":"value"}}');
```

## 🧩 How It Works

### Automatic Command Discovery
The kernel automatically scans your `/contract` directory and discovers all commands by reading their `manifest.json` files. No configuration needed!

### Smart Command Routing
Based on `commandType` in manifests:
- **`external-method`**: Kernel automatically calls specified domain method
- **`internal`**: Kernel handles declaratively using manifest templates
- **`custom`**: Kernel delegates to custom `handler.js` implementation

### Multiple Transports, Single Interface
All command types work seamlessly across all transports - write once, use everywhere.

### Zero Domain Coupling
The kernel contains zero domain-specific logic. All domain configuration and business logic lives in your `/contract` and `/textgen` folders.

## 🛠️ Advanced Features

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

## 🌐 Web UI Generation

The kernel automatically generates complete web interfaces from your contract manifests:
- Single-page application with dynamic forms
- Parameter-specific input fields (text, number, boolean, enum, etc.)
- Real-time API integration
- State management and fallbacks
- Cross-platform compatibility (web and Electron)

Generate UI with: `node main.js --generate`

## 🏗️ Architecture Highlights

### Clean Separation of Concerns
- **Application Domain** (`textgen/`) - Your business logic
- **Interface Domain** (`kernel/transports/`) - How users interact
- **Contract System** (`contract/`) - Command definitions
- **Kernel Core** (`kernel/`) - Command orchestration

### Built-in Command Types
- **External-Method**: Automatic domain method delegation (80%+ of commands)
- **Internal**: Declarative state manipulation (no handler files needed)
- **Custom**: Special business logic (handler files required)

### Transport Independence
Each transport operates independently with clear interfaces:
- **stdio**: CLI, REPL, direct execution
- **http**: REST API, web serving
- **electron**: Desktop application
- **native**: Programmatic access

## 🔄 Extensibility

The kernel is designed for extension:
- Add new transports by implementing transport interfaces
- Extend functionality through the contract manifest system
- Customize behavior through domain-specific configuration
- Generate complete web UIs from command contracts
- Serve both UI and API from the same server
- Support for plugin architectures (future)

Just copy the kernel once and focus on writing your domain-specific commands!