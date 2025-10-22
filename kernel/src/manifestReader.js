import fs from 'fs';
import path from 'path';

/**
 * Loads and merges manifest using per-file recursive merging
 */
export function loadManifest(projectRoot) {
	try {
		// Start recursion with projectRoot as both ultimate and current root
		const contracts = mergeFilesRecursive(
			projectRoot,
			projectRoot,
			'contract.json',
		);
		const commands = mergeFilesRecursive(
			projectRoot,
			projectRoot,
			'commands.json',
			{},
		);
		const help = mergeFilesRecursive(projectRoot, projectRoot, 'help.json', {});
		const runtime = mergeFilesRecursive(
			projectRoot,
			projectRoot,
			'runtime.json',
			{},
		);
		const routes = mergeFilesRecursive(
			projectRoot,
			projectRoot,
			'routes.json',
			{},
		);

		return combineManifest(contracts, commands, help, runtime, routes);
	} catch (error) {
		throw new Error(`Failed to load manifest: ${error.message}`);
	}
}

function mergeFilesRecursive(
	projectRoot, // Ultimate root (never changes)
	currentRoot, // Current level being processed
	filename,
	defaultValue = null,
	parentRoot = null, // Immediate parent
) {
	const current = loadJSONFile(currentRoot, filename, defaultValue) || {};
	let merged = { ...current };

	// Transform paths if this is commands.json and we're in a child
	if (filename === 'commands.json' && parentRoot) {
		merged = transformCommandSources(merged, currentRoot, projectRoot);
	}

	const contract = loadJSONFile(currentRoot, 'contract.json');

	if (contract && contract.sources) {
		for (const sourcePath of Object.values(contract.sources)) {
			try {
				const resolvedPath = validateSourcePath(sourcePath, currentRoot);
				if (fs.existsSync(resolvedPath)) {
					const childData = mergeFilesRecursive(
						projectRoot, // Pass through unchanged
						resolvedPath, // Child becomes new currentRoot
						filename,
						defaultValue,
						currentRoot, // CURRENT becomes parent to children
					);
					merged = deepMerge(childData, merged);
				}
			} catch (error) {
				console.warn(
					`⚠️ Failed to merge ${filename} from source '${sourcePath}': ${error.message}`,
				);
			}
		}
	}

	return merged;
}

function transformCommandSources(commands, childRoot, projectRoot) {
	const transformed = {};

	for (const [commandName, commandSpec] of Object.entries(commands)) {
		transformed[commandName] = {
			...commandSpec,
			source: resolveSourcePath(commandSpec.source, childRoot, projectRoot),
		};
	}

	return transformed;
}

function resolveSourcePath(childSource, childRoot, projectRoot) {
	if (!childSource) {
		// Always resolve relative to projectRoot
		return path.relative(projectRoot, childRoot);
	}

	if (childSource.startsWith('./') || childSource.startsWith('../')) {
		// Resolve relative to current context, then make relative to projectRoot
		const absolutePath = path.resolve(childRoot, childSource);
		return path.relative(projectRoot, absolutePath);
	}

	// Simple name → resolve relative to current context, then make relative to projectRoot
	if (
		!path.isAbsolute(childSource) &&
		!childSource.includes('/') &&
		!childSource.includes('\\')
	) {
		const absolutePath = path.resolve(childRoot, childSource);
		return path.relative(projectRoot, absolutePath);
	}

	// Absolute/NPM package - pass through unchanged
	return childSource;
}

/**
 * Combine all merged files into final manifest
 */
function combineManifest(contracts, commands, help, runtime, routes) {
	// Build final command object (not array)
	const finalCommands = {};

	// Process commands with parent precedence
	const allCommands = Object.entries(commands);

	for (const [commandName, commandSpec] of allCommands) {
		// Skip if parent already defined this command (parent wins)
		if (finalCommands[commandName]) continue;

		// Create merged command with data from all file types
		const mergedCommand = {
			name: commandName,
			...commandSpec,
			// Apply global overrides (parent wins)
			...(runtime[commandName] || {}),
			...(help[commandName] || {}),
			...(routes[commandName] || {}),
			// Deep merge parameters
			parameters: mergeParameters(
				commandSpec.parameters,
				runtime[commandName]?.parameters,
				help[commandName]?.parameters,
			),
		};

		finalCommands[commandName] = mergedCommand;
	}

	// Merge state defaults with parent precedence
	const stateDefaults = mergeStateDefaultsRecursive(contracts);

	return {
		...contracts,
		stateDefaults,
		commands: finalCommands,
	};
}

/**
 * Special recursive merge for state defaults (parent wins)
 */
function mergeStateDefaultsRecursive(contracts) {
	if (!contracts.stateDefaults) return {};

	let merged = { ...contracts.stateDefaults };

	// Recursively merge sources (parent overrides child)
	if (contracts.sources && typeof contracts.sources === 'object') {
		for (const sourcePath of Object.values(contracts.sources)) {
			try {
				const resolvedPath = validateSourcePath(sourcePath, process.cwd());
				if (fs.existsSync(resolvedPath)) {
					const childContract = loadJSONFile(resolvedPath, 'contract.json');
					if (childContract && childContract.stateDefaults) {
						merged = deepMerge(childContract.stateDefaults, merged);
					}
				}
			} catch (error) {
				console.warn(
					`⚠️ Failed to merge state defaults from source '${sourcePath}': ${error.message}`,
				);
			}
		}
	}

	return merged;
}

/**
 * Load a JSON file with optional default value
 */
function loadJSONFile(projectRoot, filename, defaultValue = null) {
	const filePath = path.join(projectRoot, filename);

	if (!fs.existsSync(filePath)) {
		if (defaultValue !== null) {
			return defaultValue;
		}
		// Only throw for required files
		if (filename === 'contract.json' || filename === 'commands.json') {
			throw new Error(`Required manifest file not found: ${filename}`);
		}
		return {};
	}

	try {
		return JSON.parse(fs.readFileSync(filePath, 'utf8'));
	} catch (error) {
		throw new Error(`Failed to parse ${filename}: ${error.message}`);
	}
}

/**
 * Validate that source path is within project root
 */
function validateSourcePath(sourcePath, currentRoot) {
	const resolvedPath = path.resolve(currentRoot, sourcePath);
	const relativeToRoot = path.relative(currentRoot, resolvedPath);

	// Prevent going outside the current source's domain
	if (relativeToRoot.startsWith('..') || path.isAbsolute(relativeToRoot)) {
		throw new Error(
			`Source path '${sourcePath}' cannot escape its root directory`,
		);
	}

	return resolvedPath;
}

/**
 * Deep merge objects
 */
function deepMerge(target, source) {
	const result = { ...target };

	for (const key in source) {
		if (
			source[key] &&
			typeof source[key] === 'object' &&
			!Array.isArray(source[key])
		) {
			result[key] = deepMerge(result[key] || {}, source[key]);
		} else {
			result[key] = source[key];
		}
	}

	return result;
}

/**
 * Deep merge parameters from multiple sources
 */
function mergeParameters(...paramSources) {
	const merged = {};

	for (const params of paramSources) {
		if (!params || typeof params !== 'object') continue;

		for (const [paramName, paramSpec] of Object.entries(params)) {
			if (merged[paramName]) {
				// Merge existing parameter spec
				merged[paramName] = { ...merged[paramName], ...paramSpec };
			} else {
				// Create new parameter spec
				merged[paramName] = { ...paramSpec };
			}
		}
	}

	return merged;
}

// Keep the existing validation and reader
export function validateManifest(manifest) {
	const errors = [];

	if (!manifest.commands || !Array.isArray(manifest.commands)) {
		errors.push('Manifest must contain a commands array');
	} else {
		manifest.commands.forEach((command, index) => {
			if (!command.name) {
				errors.push(`Command at index ${index} missing name property`);
			}
			if (!command.commandType) {
				errors.push(`Command '${command.name}' missing commandType`);
			}
			if (command.commandType === 'native-method' && !command.methodName) {
				errors.push(
					`Native-method command '${command.name}' missing methodName property`,
				);
			}
		});
	}

	if (errors.length > 0) {
		throw new Error(`Manifest validation failed:\n- ${errors.join('\n- ')}`);
	}

	return true;
}

export function manifestReader(projectRoot) {
	return loadManifest(projectRoot);
}
