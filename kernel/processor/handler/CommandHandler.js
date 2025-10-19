import { NativeAdapter } from './adapters/native.js';
import { PluginAdapter } from './adapters/plugin.js';

export class CommandHandler {
	constructor(commandRoot, projectRoot, manifest) {
		// Validate manifest parameter
		if (!manifest || typeof manifest !== 'object') {
			throw new Error('CommandHandler requires a manifest object');
		}

		// Validate config parameter
		if (projectRoot === null) {
			throw new Error('CommandHandler requires a projectRoot parameter');
		}

		this.manifest = manifest;
		this.projectRoot = projectRoot;
		
		// Create adapters
		this.nativeAdapter = new NativeAdapter(commandRoot, projectRoot, manifest);
		this.pluginAdapter = new PluginAdapter(commandRoot, projectRoot, manifest);
	}

	/**
	 * Handle a parsed command
	 */
	async handleCommand(command) {
		if (!command) return;
		
		// Get the command specification from the manifest
		const commandSpec = this.manifest.commands[command.name];

		if (!commandSpec) {
			throw new Error(`Unknown command: ${command.name}`);
		}

		// Handle native-method commands (including internal commands without methodName)
		if (commandSpec.commandType === 'native-method') {
			return await this.nativeAdapter.handleNativeMethod(command, commandSpec);
		}

		// Handle plugin commands using source system
		if (commandSpec.commandType === 'kernel-plugin') {
			return await this.pluginAdapter.handleKernelPlugin(command, commandSpec);
		}

		// If we get here, it's an unknown command type
		throw new Error(`Unknown command type '${commandSpec.commandType}' for command '${command.name}'`);
		
	}
}