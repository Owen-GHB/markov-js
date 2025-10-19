import { NativeAdapter } from './adapters/native.js';
import { PluginAdapter } from './adapters/plugin.js';

export class Handler {
	constructor(commandRoot, projectRoot) {		
		// Validate projectRoot parameter
		if (projectRoot === null) {
			throw new Error('Handler requires a projectRoot parameter');
		}

		this.projectRoot = projectRoot;
		
		// Create adapters
		this.nativeAdapter = new NativeAdapter(commandRoot, projectRoot);
		this.pluginAdapter = new PluginAdapter(commandRoot, projectRoot);
	}

	/**
	 * Handle a parsed command WITH commandSpec
	 */
	async handleCommand(command, commandSpec) {
		if (!command || !commandSpec) return;

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