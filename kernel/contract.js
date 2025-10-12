import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Synchronously load and cache all manifests at module initialization
let contractCache = null;

function initializeContractSync(contractDir, projectRoot) {
	if (contractCache) {
		return contractCache;
	}

	// Load global manifest from contract directory
	const globalManifest = JSON.parse(
		fs.readFileSync(path.join(projectRoot, 'contract.json'), 'utf8'),
	);

	// Get all command directories from the contract folder
	const items = fs.readdirSync(contractDir, { withFileTypes: true });
	const commandDirs = items
		.filter(
			(dirent) =>
				dirent.isDirectory() &&
				dirent.name !== 'index.js' &&
				dirent.name !== 'exit' && // Filter out built-in commands
				dirent.name !== 'help',
		) // Filter out built-in commands
		.map((dirent) => dirent.name);

	// Load all manifest slices synchronously
	const commands = [];

	for (const dir of commandDirs) {
		try {
			// Load manifest slice from contract directory
			const manifestPath = path.join(contractDir, dir, 'command.json');
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
				// Use the provided project root to resolve the module path
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

// Export manifestReader function that can be called with parameters
export function manifestReader(contractDir, projectRoot) {
	const { manifest } = initializeContractSync(contractDir, projectRoot);
	return manifest;
}
