import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pathResolver from './utils/path-resolver.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Synchronously load and cache all manifests at module initialization
let contractCache = null;

function initializeContractSync() {
	if (contractCache) {
		return contractCache;
	}

	// Load global manifest from contract directory using path resolver
	const globalManifest = JSON.parse(
		fs.readFileSync(
			path.join(pathResolver.getContractDir(), 'global.json'),
			'utf8',
		),
	);

	// Get all command directories from the contract folder using path resolver
	const contractDir = pathResolver.getContractDir();
	const items = fs.readdirSync(contractDir, { withFileTypes: true });
	const commandDirs = items
		.filter(
			(dirent) =>
				dirent.isDirectory() &&
				dirent.name !== 'index.js' &&
				dirent.name !== 'global.json' &&
				dirent.name !== 'exit' && // Filter out built-in commands
				dirent.name !== 'help',
		) // Filter out built-in commands
		.map((dirent) => dirent.name);

	// Load all manifest slices synchronously
	const commands = [];

	for (const dir of commandDirs) {
		try {
			// Load manifest slice from contract directory
			const manifestPath = path.join(contractDir, dir, 'manifest.json');
			let manifestSlice = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

			// Load runtime slice if it exists
			const runtimePath = path.join(contractDir, dir, 'runtime.json');
			let runtimeSlice = {};
			if (fs.existsSync(runtimePath)) {
				runtimeSlice = JSON.parse(fs.readFileSync(runtimePath, 'utf8'));
			}

			// Load help slice if it exists
			const helpPath = path.join(contractDir, dir, 'help.json');
			let helpSlice = {};
			if (fs.existsSync(helpPath)) {
				helpSlice = JSON.parse(fs.readFileSync(helpPath, 'utf8'));
			}

			// Deep merge parameters objects, preserving all properties from all three
			const mergedParameters = {};
			// First, add all parameters from the base manifest
			for (const paramName in manifestSlice.parameters || {}) {
				mergedParameters[paramName] = {
					...manifestSlice.parameters[paramName],
				};
			}
			// Then, add/extend with parameters from runtime.json
			for (const paramName in runtimeSlice.parameters || {}) {
				if (mergedParameters[paramName]) {
					// Merge parameter properties
					mergedParameters[paramName] = {
						...mergedParameters[paramName],
						...runtimeSlice.parameters[paramName],
					};
				} else {
					// Add new parameter from runtime
					mergedParameters[paramName] = {
						...runtimeSlice.parameters[paramName],
					};
				}
			}
			// Finally, add/extend with parameters from help.json
			for (const paramName in helpSlice.parameters || {}) {
				if (mergedParameters[paramName]) {
					// Merge parameter properties
					mergedParameters[paramName] = {
						...mergedParameters[paramName],
						...helpSlice.parameters[paramName],
					};
				} else {
					// Add new parameter from help
					mergedParameters[paramName] = { ...helpSlice.parameters[paramName] };
				}
			}

			// Create the merged manifest slice by combining all three
			let mergedManifestSlice = {
				...manifestSlice,
				...runtimeSlice,
				...helpSlice,
				parameters: mergedParameters,
			};

			// If this is an external-method command, resolve the module path ahead of time
			if (
				mergedManifestSlice.commandType === 'external-method' &&
				mergedManifestSlice.modulePath
			) {
				// Use the project root from the path resolver to resolve the module path
				const projectRoot = pathResolver.getProjectRoot();
				const absoluteModulePath = path.resolve(
					projectRoot,
					mergedManifestSlice.modulePath,
				);
				// Add the resolvedAbsolutePath to the manifest for use by the command handler
				mergedManifestSlice = {
					...mergedManifestSlice,
					resolvedAbsolutePath: absoluteModulePath,
				};
			}

			commands.push(mergedManifestSlice);
		} catch (error) {
			console.warn(`Warning: Could not load from ${dir}:`, error.message);
		}
	}

	const manifest = {
		...globalManifest,
		commands: commands,
	};

	contractCache = {
		manifest,
	};

	return contractCache;
}

// Initialize the contract synchronously at module load time for manifest
const { manifest } = initializeContractSync();

// Export only the manifest (this is what the processors need)
export { manifest };
