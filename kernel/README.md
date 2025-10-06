# 🧠 Modular Kernel Framework

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
│   ├── contract.js          # Contract loading and management (manifest loading only)
│   ├── CommandHandler.js    # Core command processing (custom handler loading)
│   ├── CommandProcessor.js # Command processing pipeline with state management
│   └── CommandParser.js     # Command parsing from user input
├── contract/                # Your domain-specific commands (write for each project)
│   ├── global.json          # Domain configuration (prompt, defaults, etc.)
│   ├── command1/            # Directory for each command
│   │   ├── handler.js       # Custom command implementation (optional)
│   │   └── manifest.json    # Command definition
│   └── command2/
│       ├── handler.js
│       └── manifest.json
├── yourDomain/                # Domain-specific logic
├── generated-ui/            # Auto-generated web interface
└── main.js                  # Your project's entry point
```

Note: The contract loader (`kernel/contract.js`) now focuses solely on manifest loading and caching, with module path resolution performed ahead-of-time to simplify command execution. Custom handlers are loaded on-demand by CommandHandler rather than maintained in a global registry.

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
  "modulePath": "yourDomain/index.js",
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
import { launch } from './kernel/app.js';

// Launch with current directory as project root
const projectRoot = process.cwd();
launch(process.argv.slice(2), projectRoot);
```

Note: The entry point is now a thin wrapper that delegates to `kernel/app.js`, maintaining clean separation of concerns.

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
  "name": "yourCommand",
  "commandType": "external-method",
  "modulePath": "yourDomain/index.js",
  "methodName": "yourMethod"
}
```
No handler file needed - the kernel automatically calls `yourDomain.yourMethod()`.

### 2. Internal Commands (`commandType: "internal"`) 
Handled declaratively with template-based output to set state for the REPL and CLI:
```json
{
  "name": "use",
  "commandType": "internal",
  "successOutput": "✅ Using value: {{someParamValue}}",
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
The kernel automatically scans your `/contract` directory and discovers all commands by reading their `manifest.json` files.

### Smart Command Routing
Based on `commandType` in manifests:
- **`external-method`**: Kernel automatically calls specified domain method (with ahead-of-time path resolution)
- **`internal`**: Kernel handles declaratively using manifest templates
- **`custom`**: Kernel delegates to custom `handler.js` implementation (loaded on-demand with local caching)

### Multiple Transports, Single Interface
All command types work seamlessly across all transports - write once, use everywhere.

### Zero Domain Coupling
The kernel contains zero domain-specific logic. All domain configuration and business logic lives in your `/contract` and `/yourDomain` folders.

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
- **Application Domain** (`yourDomain/`) - Your business logic
- **Interface Domain** (`kernel/transports/`) - How users interact
- **Contract System** (`contract/`) - Command definitions
- **Kernel Core** (`kernel/`) - Command orchestration

### Built-in Command Types
- **External-Method**: Automatic domain method delegation (with ahead-of-time path resolution)
- **Internal**: Declarative state manipulation (no handler files needed)
- **Custom**: Special custom logic (handler files required, loaded on-demand)

### Transport Independence
Each transport operates independently with clear interfaces:
- **stdio**: CLI, REPL, direct execution
- **http**: REST API, web serving
- **electron**: Desktop application
- **native**: Programmatic access

### Dependency Injection
All kernel components receive dependencies through constructor parameters, enabling better testability and maintainability.

Just copy the kernel once and focus on writing your domain-specific commands!