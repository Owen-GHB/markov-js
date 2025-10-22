import { fileURLToPath } from 'url';
import path from 'path';
import { Vertex } from 'vertex-kernel';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Simplified Vertex-first launcher
 */
export async function launch(args, projectRoot) {
    // Determine execution mode
    const kernelIndex = args.indexOf('--kernel');
    const isKernelMode = kernelIndex !== -1;
    
    // Handle --help at meta level
    if (args.includes('--help')) {
        showMetaHelp();
        return;
    }
    
    // Set up parameters based on mode
    const kernelCommandRoot = path.resolve(__dirname, 'command-plugins');
    const commandRoot = isKernelMode ? kernelCommandRoot : projectRoot;
    
    const vertex = new Vertex(kernelCommandRoot, projectRoot);
    const { stateDefaults } = vertex.manifest;
    
    // Load user config with elegant fallback
    const userConfigPath = path.resolve(projectRoot, 'vertex-config.json');
    let userConfig = stateDefaults; // Start with manifest defaults
    
    try {
        if (fs.existsSync(userConfigPath)) {
            const configData = fs.readFileSync(userConfigPath, 'utf8');
            userConfig = { ...stateDefaults, ...JSON.parse(configData) };
        }
    } catch {
        // Silent fallback - already set to stateDefaults
    }
    
    // Now userConfig contains the merged config (user values override defaults)
    const contextFilePath = isKernelMode 
        ? userConfigPath // Kernel mode uses the config file itself as context
        : path.resolve(projectRoot, userConfig.contextFilePath);
    
    const replHistoryFilePath = isKernelMode 
        ? null // No history for kernel mode
        : path.resolve(projectRoot, userConfig.replHistoryFilePath);
    
    // Determine command and args
    const commandName = args.length === 0 ? 'repl' : 'cli';
	// Build base args that are always needed
	const commandArgs = {
		commandRoot: commandRoot,
		projectRoot: projectRoot,
		contextFilePath: contextFilePath
	};

	// Add mode-specific args
	if (args.length === 0) {
		// REPL mode
		commandArgs.historyFilePath = replHistoryFilePath;
		commandArgs.maxHistory = userConfig.maxReplHistory;
	} else {
		// CLI mode
		commandArgs.args = isKernelMode ? args.slice(kernelIndex + 1) : args;
	}
    
    return await vertex.executeCommand({
        name: commandName,
        args: commandArgs
    });
}

/**
 * Show the meta-help
 */
function showMetaHelp() {
    console.log(`
🧠 Vertex Application Host
===============================================

USAGE:
  [your-entrypoint.js] [app-commands...]           # Run user application commands
  [your-entrypoint.js] --kernel [kernel-commands...] # Run kernel management commands
  [your-entrypoint.js] --help                      # Show this help

EXAMPLES:
  [your-entrypoint.js] --kernel help               # Kernel help (via kernel CLI)
  [your-entrypoint.js] help                        # Application help (via user CLI)

META-HELP:
  • User commands operate on your application domain
  • Kernel commands manage the Vertex hosting system
  • Both interfaces are bootstrapped by Vertex itself
  `);
}