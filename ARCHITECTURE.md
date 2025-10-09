# Architecture Overview

## Core Architecture: Vertex Kernel Framework

The Markov-js project implements a domain-agnostic command processing engine called **Vertex**. This architecture cleanly separates concerns between:

1. **Vertex Kernel** (`/kernel`) - Generic command engine
2. **Contract System** (`/contract`) - Domain-specific command definitions
3. **Domain Logic** (`/textgen`) - Business logic implementation
4. **Transports** - Interface layers (CLI, REPL, HTTP, Electron)

## Vertex Kernel Structure

### Core Components

- `kernel/app.js` - Entry point for application launch
- `kernel/kernel.js` - Kernel infrastructure launcher with support for different modes (--generate, --serve, --http, --electron)
- `kernel/contract.js` - Contract loading and command discovery system (manifest loading only)
- `kernel/CommandHandler.js` - Core command processing logic with custom handler loading
- `kernel/CommandProcessor.js` - Command processing pipeline with state management
- `kernel/CommandParser.js` - Command parsing from user input

### Plugin System

The kernel provides a configurable plugin system:

- **Plugins Directory** - Configurable via `"pluginsDir"` in config (defaults to `kernel/plugins`)
- **Transport Plugins** - CLI/REPL, HTTP, Electron, Generator interfaces
- **Dynamic Loading** - Plugins discovered and loaded at runtime
- **External Plugins** - Can be located outside the kernel directory

### Utilities

- `kernel/utils/path-resolver.js` - Centralized path resolution with configurable paths
- `kernel/utils/config-loader.js` - Configuration loading with path overrides
- `kernel/utils/StateManager.js` - Persistent state management
- `kernel/utils/PluginLoader.js` - Dynamic plugin loading system

### Command Types and Processing

The kernel supports three distinct command types:

1. **External-Method Commands** (`commandType: "external-method"`)
   - Automatically handled by calling domain methods specified in manifest
   - No handler file needed - kernel calls `resolvedAbsolutePath.methodName()` automatically
   - Module paths are resolved ahead-of-time during contract loading

2. **Internal Commands** (`commandType: "internal"`)
   - Pure state manipulation defined declaratively in manifest
   - No handler file needed - behavior defined entirely in manifest

3. **Custom Commands** (`commandType: "custom"`)
   - Require custom handler implementation in `handler.js`
   - Complete control over command logic
   - Handlers are loaded on-demand by CommandHandler with local caching

## Domain Implementation: Text Generation (`/textgen`)

The textgen module provides the business logic for Markov chain text generation and includes:

- `core/` - Main functionality (train, generate)
- `models/` - Different model implementations (Markov, VLMM, HMM)
- `io/` - I/O operations (FileHandler, ModelSerializer)
- `utils/` - Utility functions
- `sources/` - External sources (Project Gutenberg)
- `fileOps/` - File operations (model operations, corpus operations)

## Contract System

The contract system defines domain-specific commands through:

- `contract/global.json` - Application-wide configuration (name, version, prompt, state defaults)
- `contract/[command-name]/manifest.json` - Individual command definitions
- `contract/[command-name]/handler.js` - Custom command handlers (for custom command types)

Each command manifest defines:

- Command name and type
- Module path and method name (for external-method commands)
- Parameters with type validation and defaults
- Side effects (state management)
- Examples and documentation

The contract loader focuses solely on manifest loading and caching, with module path resolution performed ahead-of-time to simplify command execution.

## State Management

The system uses persistent state management with:

- Default values defined in `global.json`
- Automatic state updates through command side effects
- Persistent storage in `context/state.json`
- Runtime fallbacks to state values when parameters aren't provided

## Electron Integration

Electron integration works through advanced dynamic loading:

- `kernel/plugins/electron/electron-main.js` - Electron application entry point with dynamic kernel loading
- `kernel/plugins/electron/KernelLoader.js` - Dynamic kernel module loading at runtime
- `electron-preload.js` - Secure IPC communication setup
- Dynamic path resolution for kernel modules at runtime

## Key Design Principles

1. **Separation of Concerns** - Kernel is completely separate from domain logic
2. **Declarative Configuration** - Most behavior defined through JSON manifests
3. **Transport Independence** - Same commands work across all interfaces
4. **Automatic Discovery** - Commands discovered automatically from contract directory
5. **Extensibility** - Easy to add new commands without modifying kernel
6. **Configurable Paths** - Plugin and other directories can be configured via config
7. **Dynamic Loading** - Components loaded at runtime based on configuration
8. **State Management** - Built-in persistent state system

This architecture allows for domain-agnostic command processing where the kernel handles all the infrastructure concerns (parsing, validation, state management, interface handling) while domain-specific logic is defined through contracts and implemented in separate modules.
