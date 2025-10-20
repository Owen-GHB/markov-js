import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadManifest } from './src/manifestReader.js';
import { ResourceLoader } from './src/ResourceLoader.js';
import { resolveSecurePath } from './src/utils/path-resolver.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Universal launch function that can handle both user app and kernel commands
 * @param {string[]} args - Command line arguments
 * @param {string} projectRoot - The project root directory
 * @returns {Promise<void>}
 */
export async function launch(args, projectRoot) {
	// Check for --help first (meta-help above all helps)
	if (args.includes('--help')) {
		showMetaHelp();
		return;
	}

	// Determine execution path
	const kernelIndex = args.indexOf('--kernel');
	const isKernelMode = kernelIndex !== -1;
	const kernelCommandRoot = resolveSecurePath(__dirname, 'command-plugins');

	if (isKernelMode) {
		// Kernel commands: use kernel's command-plugins as "command root"
		const kernelArgs = args.slice(kernelIndex + 1);

		return await executeCommandPath(
			kernelArgs,
			projectRoot,
			kernelCommandRoot,
			true,
		);
	} else {
		// User app commands: use actual project root
		return await executeCommandPath(
			args,
			projectRoot,
			kernelCommandRoot,
			false,
		);
	}
}

/**
 * Universal command execution path - works for both user app and kernel commands
 * @param {string[]} args - Command arguments
 * @param {string} stateRoot - Where to store state files
 * @param {string} commandRoot - Where to load commands/manifests from
 * @param {boolean} isKernelMode - Whether we're in kernel mode (affects context file path)
 * @returns {Promise<void>}
 */
async function executeCommandPath(
	args,
	projectRoot,
	kernelCommandRoot,
	isKernelMode,
) {
	// Load manifest from the kernel command root for command definitions
	const manifest = loadManifest(kernelCommandRoot);

	// Use default plugins (CLI/REPL)
	const defaultPluginsDir = resolveSecurePath(__dirname, 'default-plugins');
	const loader = new ResourceLoader(defaultPluginsDir);

	// Determine context with user config first, kernel defaults as fallback
	let contextFilePath;
	let commandRoot;
	let replHistoryFilePath;
	let maxHistory;

	if (isKernelMode) {
		// Kernel mode: use vertex-config.json in the user's project root
		contextFilePath = resolveSecurePath(projectRoot, 'vertex-config.json');
		commandRoot = kernelCommandRoot;

		// For REPL settings, check user config first, then kernel manifest defaults
		const userConfig = loadUserConfig(contextFilePath);
		replHistoryFilePath =
			userConfig.replHistoryFilePath ||
			manifest.stateDefaults.replHistoryFilePath;
		maxHistory = userConfig.maxHistory || manifest.stateDefaults.maxHistory;
	} else {
		// Application mode: user's project is command root
		commandRoot = projectRoot;

		// Load user's config with fallback to kernel manifest
		const userConfigPath = resolveSecurePath(projectRoot, 'vertex-config.json');
		const userConfig = loadUserConfig(userConfigPath);

		contextFilePath =
			userConfig.contextFilePath ||
			resolveSecurePath(
				kernelCommandRoot,
				'manifest.stateDefaults.contextFilePath',
			);
		replHistoryFilePath =
			userConfig.replHistoryFilePath ||
			manifest.stateDefaults.replHistoryFilePath;
		maxHistory = userConfig.maxHistory || manifest.stateDefaults.maxHistory;
	}

	const run = async (plugin, method, ...params) => {
		const fn = await loader.getResourceMethod(plugin, method);
		if (!fn) {
			console.error(`❌ ${plugin}.${method} not found or invalid`);
			process.exit(1);
		}
		// Pass commandRoot so CLI/REPL load commands from the right place
		return fn(__dirname, commandRoot, projectRoot, ...params);
	};

	if (args.length === 0) {
		// REPL mode with proper config hierarchy
		return run(
			'repl',
			'start',
			contextFilePath,
			replHistoryFilePath,
			maxHistory,
		);
	}

	// CLI mode
	return run('cli', 'run', contextFilePath, args);
}

/**
 * Load user configuration with graceful fallback to empty object
 */
function loadUserConfig(configPath) {
	try {
		if (fs.existsSync(configPath)) {
			const configData = fs.readFileSync(configPath, 'utf8');
			return JSON.parse(configData);
		}
	} catch (error) {
		console.warn(
			`⚠️ Could not load user config from ${configPath}:`,
			error.message,
		);
	}
	return {};
}

/**
 * Show the meta-help that sits above both help systems
 */
function showMetaHelp() {
	console.log(`
🧠 Vertex Application Host
===============================================

USAGE:
  [your-entrypoint.js] [app-commands...]           # Run application commands
  [your-entrypoint.js] --kernel [kernel-commands...] # Run kernel commands
  [your-entrypoint.js] --help                      # Show this help

EXAMPLES:
  [your-entrypoint.js] --kernel help               # Kernel help
  [your-entrypoint.js] help                        # Application help

META-HELP:
  • Application commands operate on the hosted application
  • Kernel commands manage the Vertex application hosting kernel
  • Use 'help' for application command help
  • Use '--kernel help' for kernel command help
  `);
}

// Note: This file is not meant to be run directly. Use a project-specific entry point.
