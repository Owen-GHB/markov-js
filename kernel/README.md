# 🧠 Vertex Kernel Framework

A domain-agnostic command processing engine that automatically discovers and executes commands defined in your domain-specific contract, with support for multiple transports and built-in command types.

## 🎯 Purpose

Vertex provides a universal command processing system that works with any domain. Simply define your commands in a contract folder and the kernel automatically discovers, validates, and executes them through multiple interfaces.

## 📁 Project Structure

```
your-project/
├── kernel/                    # Generic command engine (copy once) - "Vertex"
│   ├── utils/                 # Shared utilities
│   ├── contract.js            # Contract loading and management
│   ├── CommandHandler.js      # Core command processing
│   ├── CommandProcessor.js    # Command pipeline with state management
│   └── CommandParser.js       # Command parsing from user input
├── external-plugins/          # Configurable plugin directory (configurable via config.json)
│   ├── cli/                   # CLI interface
│   ├── repl/                  # REPL interface
│   ├── http/                  # HTTP server and API
│   ├── electron/              # Electron desktop application
│   └── generator/             # UI generation system
├── contract/                  # Your domain-specific commands
│   ├── global.json            # Domain configuration
│   └── [command-name]/        # Directory for each command
│       ├── manifest.json      # Command definition
│       ├── runtime.json       # Runtime behavior
│       ├── help.json          # User documentation
│       └── handler.js         # Custom command implementation (optional)
├── yourDomain/                # Domain-specific logic
├── generated-ui/              # Auto-generated web interface
└── main.js                    # Your project's entry point
```

Note: The contract loader (`kernel/contract.js`) focuses solely on manifest loading and caching, with module path resolution performed ahead-of-time to simplify command execution. The plugin system is fully configurable via `"pluginsDir"` in the kernel config.

## 🚀 Quick Start

### 1. Copy Vertex

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
	"parameters": {
		"param1": {
			"type": "string",
			"required": true,
			"description": "Required parameter"
		}
	}
}
```

### 3. Configure Plugin Directory (Optional)

You can configure where plugins are loaded from in `kernel/config.json`:

```json
{
	"paths": {
		"pluginsDir": "external-plugins" // or "kernel/plugins", "/absolute/path", etc.
	}
}
```

### 4. Create Your Entry Point

Create a `main.js` file at your project root:

```javascript
#!/usr/bin/env node
import { launch } from './kernel/app.js';

// Launch with current directory as project root
const projectRoot = process.cwd();
launch(process.argv.slice(2), projectRoot);
```

The entry point delegates to Vertex, maintaining clean separation of concerns.

### 5. Run Your Application

```bash
# CLI mode
node main.js yourcommand param1=value1

# REPL mode
node main.js

# Generate web UI
node main.js --generate

# Serve web UI and API (uses --http which now serves both UI and API)
node main.js --http

# Launch Electron app
node main.js --electron
```

## 🧠 Command Types

Vertex supports three distinct command types with different handling strategies:

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

Handled declaratively with template-based output:

```json
{
	"name": "use",
	"commandType": "internal",
	"successOutput": "✅ Using value: {{someParamValue}}",
	"parameters": {}
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

Vertex provides multiple interfaces to access your commands:

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

HTTP server serving both web UI and API:

```bash
# Start server with UI and API
node main.js --http

# Make API calls
GET http://localhost:8080?json={"name":"yourcommand","args":{"param":"value"}}
POST http://localhost:8080/api with JSON body

# UI available at: http://localhost:8080/
# API available at: http://localhost:8080/api
```

### Electron Transport

Desktop application with native UI. Uses dynamic kernel loading:

- `external-plugins/electron/electron-main.js` - Entry point that dynamically loads kernel modules
- `external-plugins/electron/KernelLoader.js` - Handles dynamic module loading at runtime

```bash
# Launch Electron app
node main.js --electron
```

## 🧩 How It Works

### Automatic Command Discovery

The kernel automatically scans your `/contract` directory and discovers all commands by reading their manifest files.

### Three-File Contract System

Commands are defined across three JSON files:

- `manifest.json` - Core kernel requirements (type, paths, params)
- `runtime.json` - Runtime behavior (defaults, validation, side effects)
- `help.json` - User documentation (descriptions, examples)

### Smart Command Routing

Based on `commandType` in manifests:

- **`external-method`**: Kernel automatically calls specified domain method with ahead-of-time path resolution
- **`internal`**: Kernel handles declaratively using manifest templates
- **`custom`**: Kernel delegates to custom `handler.js` implementation with on-demand loading

### Multiple Transports, Single Interface

All command types work seamlessly across all transports - write once, use everywhere.

### Zero Domain Coupling

The kernel contains zero domain-specific logic. All domain configuration and business logic lives in your `/contract` and `/yourDomain` folders.

## 🛠️ Advanced Features

### Configurable Plugin Directory

The plugin system supports configurable plugin directories:

- Set `"pluginsDir"` in `kernel/config.json`
- Can point to internal or external directories
- Uses path resolver for consistent path handling

### Dynamic Kernel Loading

The Electron plugin uses advanced dynamic loading:

- Kernel modules loaded dynamically based on runtime paths
- Two path arguments passed: `--project-root` and `--kernel-path`
- Maintains independence from hardcoded paths

### State Management

The kernel provides persistent state management:

```json
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
	"parameters": {
		"projectName": {
			"type": "string",
			"required": true,
			"runtimeFallback": "currentProject"
		}
	}
}
```

### Template Strings

Use template strings for dynamic values:

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
- Parameter-specific input fields
- Real-time API integration
- State management and fallbacks

Generate UI with: `node main.js --generate`

Just copy Vertex once and focus on writing your domain-specific commands!
