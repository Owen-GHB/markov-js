# 🧠 Vertex Kernel Framework

A universal command processing engine that automatically discovers and executes commands defined in your domain-specific contract. Build once, run anywhere with any domain through CLI, REPL, HTTP, Electron, and web interfaces.

## 🎯 What Problem Does Vertex Solve?

Traditional applications are tightly coupled to their user interfaces. If you build a CLI tool, you can't easily add a web UI. If you build a web app, you can't easily add a desktop version. 

**Vertex solves this** by separating your domain logic from your user interfaces. Define your commands once in a simple contract, and Vertex automatically provides multiple ways to interact with them.

# 📁 Project Structure

```
your-project/
├── kernel/                    # Universal command engine (copy once)
│   ├── utils/
│   │   ├── ResourceLoader.js  # Dynamic module loading with caching
│   │   └── path-resolver.js   # Secure path resolution
│   ├── processor/
│   │   ├── CommandParser.js   # Multi-format command parsing
│   │   ├── CommandHandler.js  # Command routing & execution
│   │   ├── CommandProcessor.js # Unified processing pipeline
│   │   ├── StateManager.js    # Persistent state with side effects
│   │   └── adapters/          # Command type handlers
│   │   └── parsers/           # Command parsing utilities
│   ├── app.js                 # REPL/CLI launcher
│   ├── kernel.js              # UI/Electron/HTTP launcher
│   ├── contract.js            # Advanced contract loading & validation
│   ├── config.json            # Kernel configuration
│   ├── default-plugins/       # Built-in interface plugins
│   │   ├── cli/               # Command line interface
│   │   ├── repl/              # Interactive REPL interface
│   │   └── shared/            # Shared utilities for plugins
│   └── command-plugins/       # Extended functionality plugins
│       ├── generate/          # EJS-based UI generation system
│       ├── http/              # HTTP server with UI + API
│       ├── electron/          # Electron desktop application
│       └── [plugin-name]/     # Custom plugins
│           ├── contract.json  # Plugin-specific contract
│           ├── commands.json  # Plugin commands
│           ├── runtime.json   # Plugin runtime behavior
│           ├── help.json      # Plugin documentation
│           └── index.js       # Plugin implementation
├── contract.json              # Main domain configuration & sources
├── commands.json              # Domain command definitions
├── runtime.json               # Runtime behavior & side effects
├── help.json                  # User documentation & examples
├── your-domain/               # Your domain-specific logic
│   └── index.js               # Domain methods
└── main.js                    # Project entry point
```

## 📂 Key Directories Explained

### `kernel/` - The Engine Core
- **Never modify these files** - they work with any domain
- Contains the universal command processing logic
- Handles parsing, validation, execution, and state management

### `kernel/default-plugins/` - Built-in Interfaces
- **cli/**: Command-line interface for direct command execution
- **repl/**: Interactive Read-Eval-Print Loop with history and completion
- **shared/**: Common utilities used by multiple plugins

### `command-plugins/` - Extended Capabilities
- **generate/**: Creates web UIs from your contract using EJS templates
- **http/**: Serves both static UI files and REST API endpoints
- **electron/**: Desktop application wrapper
- Add your own plugins here for custom functionality

### Root Level Files - Your Domain Contract
- **contract.json**: App metadata, sources, and state defaults
- **commands.json**: Command definitions and parameters
- **runtime.json**: Side effects and behavior rules
- **help.json**: Examples and user documentation

This structure separates the immutable engine (`kernel/`) from your domain-specific code and plugins, making it easy to update the framework while preserving your custom logic.

## 🚀 Quick Start

### 1. Copy the Kernel

Copy the entire `/kernel` directory to your project. This contains the universal command engine that works with any domain.

### 2. Define Your Domain Contract

Create these four files to describe your application:

**contract.json** - Basic app info and dependencies
```json
{
  "name": "my-project-manager",
  "version": "1.0.0",
  "description": "Manage projects with templates",
  "sources": {
    "projectOps": "./project-operations"
  },
  "stateDefaults": {
    "currentProject": null,
    "lastOperation": "none"
  }
}
```

**commands.json** - Define your commands and parameters
```json
{
  "createProject": {
    "commandType": "native-method",
    "source": "projectOps",
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
  "useProject": {
    "commandType": "internal",
    "description": "Set current project context",
    "parameters": {
      "projectName": {
        "type": "string",
        "required": true,
        "runtimeFallback": "currentProject"
      }
    }
  }
}
```

**runtime.json** (optional) - Define side effects and behavior
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
  "useProject": {
    "sideEffects": {
      "setState": {
        "currentProject": {"fromParam": "projectName"}
      }
    },
    "successOutput": "✅ Now using project: {{projectName}}"
  }
}
```

**help.json** (optional) - Add examples and documentation
```json
{
  "createProject": {
    "examples": [
      "createProject(\"my-app\")",
      "createProject(\"my-app\", template=\"advanced\")"
    ],
    "notes": "Projects are created in the current workspace directory."
  }
}
```

### 3. Implement Your Domain Logic

**project-operations/index.js**
```javascript
export function createProject(args) {
  const { projectName, template = 'basic' } = args;
  
  // Your actual business logic here
  console.log(`Creating project "${projectName}" with ${template} template`);
  
  // Create files, directories, etc.
  const projectId = `proj_${Date.now()}`;
  
  return {
    success: true,
    projectId: projectId,
    message: `Project ${projectName} created successfully with ${template} template`
  };
}

export function deleteProject(args) {
  const { projectName } = args;
  // Your deletion logic here
  return { success: true, message: `Project ${projectName} deleted` };
}
```

### 4. Create Your Entry Point

**main.js**
```javascript
#!/usr/bin/env node
import { launch } from './kernel/app.js';

const projectRoot = process.cwd();
launch(process.argv.slice(2), projectRoot).catch(console.error);
```

### 5. Start Using Your Application

```bash
# Make it executable
chmod +x main.js

# Run in interactive REPL mode
./main.js

# Or use CLI commands directly
./main.js createProject "my-app"
./main.js createProject projectName="my-app" template="advanced"
./main.js useProject "my-app"
```

## 🎛️ Multiple Interfaces, One Codebase

### Command Line Interface (CLI)
```bash
# Multiple syntaxes supported
./main.js createProject "my-app"
./main.js createProject projectName="my-app" template="advanced"
./main.js "createProject({projectName: 'my-app', template: 'custom'})"
```

### Interactive REPL
```bash
./main.js
> createProject("my-app", template="advanced")
> useProject("my-app") 
> help(createProject)
> exit()
```

### Web UI + REST API
```bash
# First generate the web interface
./main.js generate

# Then serve it
./main.js http

# Access at http://localhost:8080
# API available at http://localhost:8080/api
```

### Desktop App
```bash
./main.js electron
```

## 🧩 How Commands Work

### Three Command Types

**1. Native Methods** - Call your JavaScript functions
```json
{
  "createProject": {
    "commandType": "native-method",
    "source": "projectOps",
    "methodName": "createProject"
  }
}
```

**2. Internal Commands** - Declarative commands handled by Vertex
```json
{
  "useProject": {
    "commandType": "internal",
    "description": "Set current project context",
    "sideEffects": {
      "setState": {
        "currentProject": {"fromParam": "projectName"}
      }
    }
  }
}
```

**3. Plugin Commands** - Extend Vertex with new capabilities
```json
{
  "generate": {
    "commandType": "kernel-plugin", 
    "methodName": "run",
    "description": "Generate web UI"
  }
}
```

## 🔗 Connect Multiple Domains

Vertex can combine commands from multiple sources:

```json
{
  "sources": {
    "projects": "./project-management",
    "users": "./user-management", 
    "utils": "../shared-utilities"
  }
}
```

Each source can have its own contract files, and Vertex automatically merges them with conflict detection.

## 💾 State Management

### Persistent Application State
```json
{
  "stateDefaults": {
    "currentProject": null,
    "userPreferences": {"theme": "dark"},
    "recentItems": [],
    "apiKeys": {}
  }
}
```

### Automatic State Updates
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

## 🛡️ Built-in Security

- **Path Security**: All file operations are contained within your project
- **Parameter Validation**: Type checking, ranges, and enum validation
- **Conflict Detection**: Warns about duplicate command names
- **Source Containment**: External sources cannot escape their boundaries

## 🔧 Advanced Features

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
  "files": {
    "type": "array",
    "description": "List of files to process"
  }
}
```

### Runtime Value Fallbacks
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

## 🚨 Error Handling

Vertex provides clear error messages:
- **Command not found**: "Unknown command: createproject"
- **Parameter validation**: "Parameter projectName must be a string"  
- **Type errors**: "Parameter amount must be of type: integer|number"
- **Source errors**: "Failed to load source 'myDomain': Source file not found"

## 🔮 Why Choose Vertex?

### For Solo Developers
- **Rapid Prototyping**: Get multiple interfaces with minimal code
- **Future-Proof**: Add web, desktop, or API interfaces without rewriting
- **Consistent Experience**: Same commands work everywhere

### For Teams
- **Separation of Concerns**: Domain experts write logic, UI experts build interfaces
- **API-First by Default**: Every command is automatically available via REST
- **Tool Agnostic**: Use any frontend framework with the generated APIs

---

**Vertex Kernel** - Build once, run anywhere with any domain! 🚀