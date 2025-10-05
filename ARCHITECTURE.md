# Architecture Overview

## Core Architecture: Message-Passing Kernel Framework

The Markov-js project implements a generic, domain-agnostic command processing engine known as the "kernel". This architecture separates concerns between:

1. **Kernel** (`/kernel`) - Generic command engine
2. **Contract** (`/contract`) - Domain-specific command definitions
3. **Domain Logic** (`/textgen`) - Business logic implementation
4. **Transports** - Interface layers (CLI, REPL, HTTP, Electron)

## Kernel Structure

### Core Components

- `kernel/app.js` - Entry point for application launch
- `kernel/kernel.js` - Kernel infrastructure launcher with support for different modes (--generate, --serve, --http, --electron)
- `kernel/contract.js` - Contract loading and command discovery system
- `kernel/CommandHandler.js` - Core command processing logic
- `kernel/CommandProcessor.js` - Command processing pipeline with state management
- `kernel/CommandParser.js` - Command parsing from user input

### Transport System

The kernel provides multiple interface transports:

- **stdio** (`/kernel/transports/stdio/`) - CLI and REPL interfaces
- **http** (`/kernel/transports/http/`) - HTTP server and API (not examined directly)
- **electron** (`/kernel/transports/electron/`) - Electron desktop application
- **native** (`/kernel/transports/native/`) - Direct programmatic API (not examined directly)

### Utilities

- `kernel/utils/path-resolver.js` - Centralized path resolution
- `kernel/utils/StateManager.js` - Persistent state management
- `kernel/generator/` - UI generation system

### Command Types and Processing

The kernel supports three distinct command types:

1. **External-Method Commands** (`commandType: "external-method"`)
   - Automatically handled by calling domain methods specified in manifest
   - No handler file needed - kernel calls `modulePath.methodName()` automatically

2. **Internal Commands** (`commandType: "internal"`)
   - Pure state manipulation defined declaratively in manifest
   - No handler file needed - behavior defined entirely in manifest

3. **Custom Commands** (`commandType: "custom"`)
   - Require custom handler implementation in `handler.js`
   - Complete control over command logic

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

## State Management

The system uses persistent state management with:
- Default values defined in `global.json`
- Automatic state updates through command side effects
- Persistent storage in `context/state.json`
- Runtime fallbacks to state values when parameters aren't provided

## Electron Integration

Electron integration works through:
- `electron-main.js` - Electron application entry point
- `electron-preload.js` - Secure IPC communication setup
- `kernel/transports/electron/` - Command handling and UI management
- Generated UI from contract manifests served to Electron

## Key Design Principles

1. **Separation of Concerns** - Kernel is completely separate from domain logic
2. **Declarative Configuration** - Most behavior defined through JSON manifests
3. **Transport Independence** - Same commands work across all interfaces
4. **Automatic Discovery** - Commands discovered automatically from contract directory
5. **Extensibility** - Easy to add new commands without modifying kernel
6. **State Management** - Built-in persistent state system

This architecture allows for domain-agnostic command processing where the kernel handles all the infrastructure concerns (parsing, validation, state management, interface handling) while domain-specific logic is defined through contracts and implemented in separate modules.