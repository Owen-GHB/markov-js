# Vertex Application Host

🧠 **Universal Command Engine with Declarative Workflows**

Vertex is a powerful application host that transforms how you build and orchestrate commands across multiple interfaces - currently CLI, REPL, HTTP, and Electron - all from a single declarative configuration.

## What Problem Does Vertex Solve?

Traditional applications often have separate implementations for:
- CLI commands
- Web APIs  
- Desktop app menus
- Interactive REPL sessions

Vertex lets you **define commands once** and use them everywhere through a unified manifest system.

## Quick Start

### 1. Define Your Commands

```json
// commands.json
{
  "generateText": {
    "commandType": "native-method",
    "methodName": "generate",
    "description": "Generate text using AI",
    "parameters": {
      "prompt": {
        "type": "string",
        "required": true,
        "description": "What to generate"
      },
      "temperature": {
        "type": "number", 
        "default": 0.7,
        "description": "Creativity level"
      }
    }
  }
}
```

### 2. Use Anywhere

**CLI:**
```bash
node app.js generateText "Hello world" temperature=0.9
```

**REPL:**
```javascript
> generateText("Hello world", temperature=0.9)
```

**HTTP API:**
```bash
curl "http://localhost:8080/api?command=generateText('Hello%20world',%20temperature=0.9)"
```

**Web UI:** (Auto-generated forms)

### 3. Chain Commands with Conditions

```json
// routes.json
{
  "generateText": {
    "next": {
      "success": {
        "when": "{{output.confidence}} > 0.8",
        "publishPost": {
          "parameters": {
            "content": "{{output.text}}"
          }
        }
      },
      "needsReview": {
        "sendForReview": {
          "parameters": {
            "text": "{{output.text}}",
            "confidence": "{{output.confidence}}"
          }
        }
      }
    }
  }
}
```

## Powerful Features

### 🎯 **Universal Interface Support**
- CLI with auto-completion and help
- Interactive REPL with history
- HTTP server with auto-generated UI
- Electron desktop app
- All from the same command definitions

### 🔗 **Declarative Command Chaining**
Create complex workflows without writing glue code:

```json
"login": {
  "next": {
    "mfaRequired": {
      "when": "{{output.mfaRequired}} == true",
      "sendMfaCode": {"parameters": {"userId": "{{output.userId}}"}}
    },
    "success": {
      "createSession": {"parameters": {"user": "{{output.user}}"}}
    }
  }
}
```

### 📦 **Binary Data Support**
Handle files and binary data seamlessly:
```javascript
processImage({image: "data:image/png;base64,...", format="webp"})
```

### 🌳 **Hierarchical Configuration**
Override and extend behavior at any level:
```
your-app/
├── commands.json     # Override plugin commands
├── routes.json       # Add app-specific workflows
└── command-plugins/
    └── text-generator/
        └── commands.json  # Plugin commands
```

### 🔌 **Extensible Plugin System**
Add new command types, data types, and adapters:
```json
"sources": {
  "text-gen": "./command-plugins/text-generator",
  "auth": "./command-plugins/auth-system"
}
```

## Why Vertex?

### For Application Developers:
- **Write once, run anywhere** - same commands work across all interfaces
- **Declarative workflows** - complex logic without complex code
- **Progressive enhancement** - start simple, add complexity as needed

### For Plugin Authors:
- **Standardized packaging** - easy distribution and consumption
- **Composition over inheritance** - mix and match functionality
- **Override-friendly** - users can customize without forking

### For Teams:
- **Single source of truth** - all command definitions in one place
- **Self-documenting** - manifests describe capabilities and usage
- **Tooling friendly** - predictable structure enables automation

## Getting Started

1. **Create your entry point:**
```javascript
// app.js
import { launch } from './vertex-kernel/app.js';
launch(process.argv.slice(2), process.cwd());
```

2. **Define your manifest files** (`contract.json`, `commands.json`, etc.)

3. **Run commands:**
```bash
node app.js --help                    # See available commands
node app.js generateText "Hello"      # CLI mode  
node app.js                           # REPL mode
node app.js --kernel help             # Kernel commands
```

## Architecture Philosophy

Vertex follows the **"minimum required complexity"** principle:
- Start simple with basic command execution
- Add features only when they provide clear value
- Keep the core small and extensible
- Enable complex workflows through composition, not complexity

---

**Ready to build universal applications?** Vertex turns your command definitions into a full-stack application with CLI, web, and desktop interfaces automatically.

*No more rewriting the same logic for different interfaces. Define once, run everywhere.* 🚀