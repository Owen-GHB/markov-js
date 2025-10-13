# 🧠 Vertex Kernel Framework

A domain-agnostic command processing engine that automatically discovers and executes commands defined in your domain-specific contract, with support for multiple transports and built-in command types.

## 🎯 Purpose

Vertex provides a universal command processing system that works with any domain. Simply define your commands in a 4-file contract and the kernel automatically discovers, validates, and executes them through multiple interfaces with full state management and recursive source expansion.

## 📁 Project Structure

```
your-project/
├── kernel/                    # Generic command engine (copy once) - "Vertex"
│   ├── utils/                 # Shared utilities
│   │   ├── config-loader.js   # Advanced configuration with security
│   │   └── PluginLoader.js    # Dynamic plugin loader
│   ├── processor/             # Command processing pipeline
│   │   ├── CommandParser.js   # Multi-format command parsing
│   │   ├── CommandHandler.js  # Command routing & execution
│   │   ├── CommandProcessor.js # Unified processing pipeline
│   │   ├── StateManager.js    # Persistent state with side effects
│   │   └── adapters/          # Command type handlers
│   ├── app.js                 # REPL/CLI launcher
│   ├── kernel.js              # UI/Electron/HTTP launcher  
│   ├── contract.js            # Advanced contract loading & validation
│   └── config.json            # Kernel configuration
├── external-plugins/          # Plugin directory (configurable)
│   ├── cli/                   # CLI interface
│   │   └── index.js           # CLI plugin implementation
│   ├── repl/                  # REPL interface  
│   ├── http/                  # HTTP server with UI+API
│   ├── electron/              # Electron desktop app
│   └── generate/              # UI generation system
├── contract.json              # Domain configuration & sources
├── commands.json              # Command definitions
├── runtime.json               # Runtime behavior & side effects
├── help.json                  # User documentation & examples
├── your-domain/               # Your domain-specific logic
│   └── index.js               # Domain methods
└── main.js                    # Project entry point
```

## 🚀 Quick Start

### 1. Copy Vertex

Copy the entire `/kernel` directory to your project. This is the universal command engine - you never need to modify it.

### 2. Create Your Contract (4-File System)

Create these four files in your **project root**:

**contract.json**
```json
{
  "name": "your-app-name",
  "version": "1.0.0",
  "description": "Your application description",
  "sources": {
    "yourDomain": "./your-domain",
    "sharedUtils": "../shared-utils"  // Supports recursive sources!
  },
  "stateDefaults": {
    "currentUser": null,
    "currentProject": null,
    "lastOperation": "none"
  }
}
```

**commands.json**
```json
{
  "createProject": {
    "commandType": "native-method",
    "source": "yourDomain", 
    "methodName": "createProject",
    "description": "Create a new project",
    "parameters": {
      "projectName": {
        "type": "string",
        "required": true,
        "description": "Name of the project to create"
      },
      "template": {
        "type": "string",
        "enum": ["basic", "advanced", "custom"],
        "default": "basic",
        "description": "Project template type"
      }
    }
  },
  "use": {
    "commandType": "internal",
    "description": "Set current project context",
    "parameters": {
      "projectName": {
        "type": "string", 
        "required": true,
        "runtimeFallback": "currentProject",
        "description": "Project name to use"
      }
    }
  }
}
```

**runtime.json** (optional - for side effects & behavior)
```json
{
  "createProject": {
    "sideEffects": {
      "setState": {
        "currentProject": {"fromParam": "projectName"},
        "lastOperation": {"template": "created_{{projectName}}"}
      }
    }
  },
  "use": {
    "sideEffects": {
      "setState": {
        "currentProject": {"fromParam": "projectName"}
      }
    },
    "successOutput": "✅ Now using project: {{projectName}}"
  }
}
```

**help.json** (optional - for user documentation)
```json
{
  "createProject": {
    "examples": [
      "createProject(\"my-app\")",
      "createProject(\"my-app\", template=\"advanced\")",
      "createProject({projectName: \"my-app\", template: \"custom\"})"
    ],
    "notes": "Projects are created in the current workspace directory."
  }
}
```

### 3. Create Your Domain Code

**your-domain/index.js**
```javascript
export function createProject(args) {
  const { projectName, template = 'basic' } = args;
  
  // Your domain logic here
  console.log(`Creating project "${projectName}" with ${template} template`);
  
  // Return value becomes command output
  return {
    success: true,
    projectId: `proj_${Date.now()}`,
    message: `Project ${projectName} created successfully with ${template} template`
  };
}

export function otherMethod(args) {
  // Can be called by other commands
  return "Operation completed";
}
```

### 4. Create Entry Points

**main.js** (for REPL/CLI)
```javascript
#!/usr/bin/env node
import { launch } from './kernel/app.js';

const projectRoot = process.cwd();
launch(process.argv.slice(2), projectRoot).catch(console.error);
```

**kernel-main.js** (for UI/Electron/HTTP)
```javascript
#!/usr/bin/env node  
import { launch } from './kernel/kernel.js';

const projectRoot = process.cwd();
launch(process.argv.slice(2), projectRoot).catch(console.error);
```

### 5. Run Your Application

```bash
# REPL mode (interactive with history & completion)
node main.js

# CLI mode - multiple syntaxes supported
node main.js createProject "my-app"
node main.js createProject projectName="my-app" template="advanced"
node main.js "createProject({projectName: 'my-app', template: 'custom'})"

# Generate web UI from your contract
node kernel-main.js --generate

# Serve web UI + REST API
node kernel-main.js --http

# Launch Electron desktop app
node kernel-main.js --electron

# Show kernel help
node kernel-main.js
```

## 🧠 Command Types

### 1. Native-Method Commands (`commandType: "native-method"`)

Call methods from your domain code with automatic source resolution:

```json
{
  "name": "createProject",
  "commandType": "native-method",
  "source": "yourDomain",
  "methodName": "createProject"
}
```

**Your domain method signature:**
```javascript
export function yourMethod(args) {
  // args contains validated parameters
  return "Success result"; // Return value becomes command output
}
```

### 2. Internal Commands (`commandType: "internal"`)

Declarative commands handled by the kernel with templates and side effects:

```json
{
  "name": "use",
  "commandType": "internal",
  "successOutput": "✅ Using: {{projectName}}",
  "parameters": {
    "projectName": {
      "type": "string", 
      "required": true,
      "runtimeFallback": "currentProject"
    }
  },
  "sideEffects": {
    "setState": {
      "currentProject": {"fromParam": "projectName"}
    }
  }
}
```

## 🔌 Advanced Source System

### Recursive Source Expansion

Sources can reference other Vertex projects with their own contracts:

**contract.json**
```json
{
  "sources": {
    "myDomain": "./my-domain",
    "sharedTools": "../shared-tools",
    "teamUtils": "../../team-utils"
  }
}
```

**Features:**
- **Automatic conflict detection** - warns on duplicate command names
- **Path security** - prevents escaping project root
- **State inheritance** - child state defaults merge with parent
- **Command transformation** - paths are properly resolved between contexts

## ⚙️ Configuration

**kernel/config.json**
```json
{
  "paths": {
    "pluginsDir": "external-plugins"
  }
}
```

**Plugin-specific configs** are automatically loaded from `external-plugins/plugin-name/config.json` and merged with global configuration.

## 🎛️ Available Transports

### REPL Transport
Interactive shell with tab completion, history, and rich help:
```bash
node main.js
> help
> help(createProject)
> createProject("my-app", template="advanced")
> exit
```

### CLI Transport  
Execute commands directly with multiple syntaxes:
```bash
node main.js createProject "my-app"
node main.js createProject projectName="my-app" template="advanced"
node main.js "createProject({projectName: 'my-app', template: 'custom'})"
```

### HTTP Transport
Web UI + REST API on port 8080:
```bash
node kernel-main.js --http
```
- **UI**: http://localhost:8080/
- **API**: http://localhost:8080/api
- **Command via GET**: `http://localhost:8080/api/command?json={"name":"createProject","args":{"projectName":"my-app"}}`

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

## 🗂️ State Management

### Persistent State
State is automatically saved and restored between sessions:

```json
{
  "stateDefaults": {
    "currentProject": null,
    "userPreferences": {"theme": "dark"},
    "recentItems": []
  }
}
```

### Side Effects
Commands can automatically update state:

```json
{
  "sideEffects": {
    "setState": {
      "currentProject": {"fromParam": "projectName"},
      "lastOperation": {"template": "created_{{projectName}}"}
    },
    "clearState": ["tempData"],
    "clearStateIf": {
      "currentProject": {"fromParam": "projectName"}
    }
  }
}
```

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
  },
  "files": {
    "type": "array",
    "description": "List of files to process"
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

## 🔒 Security Features

- **Path security validation** - prevents directory traversal
- **Source containment** - sources cannot escape project root
- **Parameter validation** - type checking and range validation
- **Command conflict detection** - warns on duplicate commands

## 🚨 Error Handling

The system provides detailed error messages:
- **Command not found**: "Unknown command: createproject"
- **Parameter validation**: "Parameter projectName must be a string"
- **Source errors**: "Failed to load source 'myDomain': Source file not found"
- **Type errors**: "Parameter amount must be of type: integer|number"

## 📝 Command Syntax

All these work identically:

**Function style:**
```
createProject("my-app", template="advanced")
```

**Object style:**
```
createProject({projectName: "my-app", template: "advanced"})  
```

**CLI style:**
```
createProject my-app template=advanced
```

**JSON style:**
```json
{"name": "createProject", "args": {"projectName": "my-app"}}
```

## 🎯 How It Works

### Command Processing Pipeline:
1. **Parse**: Convert input to command object using multi-format parser
2. **Validate**: Check parameters against manifest with type checking
3. **Resolve**: Expand recursive sources and handle conflicts
4. **Execute**: Route to appropriate handler based on `commandType`
5. **Apply Side Effects**: Update state and persist if command succeeds

### Source Resolution:
- **Native methods**: Loaded from sources defined in `contract.json`
- **Recursive expansion**: Sources can have their own 4-file contracts
- **Module caching**: Sources are cached for performance
- **Path security**: All paths validated against project root

### State Management:
- **Persistent state**: Saved to context file automatically
- **Template rendering**: `{{paramName}}` in success messages and state values
- **Side effects**: Automatic state updates based on command results
- **Runtime fallbacks**: Missing parameters can use current state values

---

**Vertex Kernel** - Build once, run anywhere with any domain! 🚀