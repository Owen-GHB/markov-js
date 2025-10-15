# 🧠 Vertex Kernel

A universal command processing engine that executes commands defined in your domain-specific contract. Build once, run anywhere with any domain through CLI, REPL, HTTP, Electron, and web interfaces.

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
