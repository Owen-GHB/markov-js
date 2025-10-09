import path from 'path';

/**
 * Start the Electron plugin by launching electron-main.js via npx
 * @param {Object} config - Configuration object (contains paths information)
 * @param {Object} commandProcessor - Command processor instance (not used directly, as electron-main.js recreates kernel)
 * @returns {Promise<void>}
 */
export async function start(config, commandProcessor) {
	// Since Electron needs to be launched as a separate process, we spawn electron using npx
	// which will run electron-main.js. The electron-main.js will now use dynamic kernel loading.
	return import('child_process')
		.then(({ spawn }) => {
			// Get the project root and kernel path from the config
			const projectRoot = process.cwd(); // Use current working directory as project root
			const kernelPath =
				config.paths?.kernelDir || path.join(projectRoot, 'kernel');

			// Launch electron with the electron-main.js file and pass the required paths as arguments
			const electronMainPath = path.join(
				projectRoot,
				'kernel',
				'plugins',
				'electron',
				'electron-main.js',
			);
			const npxProcess = spawn(
				'npx',
				[
					'electron',
					electronMainPath,
					'--project-root',
					projectRoot,
					'--kernel-path',
					kernelPath,
				],
				{
					stdio: 'inherit',
					cwd: projectRoot, // Crucial: run from project root
					shell: true,
				},
			);

			npxProcess.on('error', (err) => {
				console.error('❌ Failed to start Electron:', err.message);
				console.log(
					'Make sure you have installed Electron as a dev dependency: npm install --save-dev electron',
				);
				process.exit(1);
			});

			npxProcess.on('close', (code) => {
				console.log(`Electron process exited with code ${code}`);
				process.exit(code);
			});
		})
		.catch((err) => {
			console.error('❌ Failed to launch Electron:', err.message);
			process.exit(1);
		});
}

/**
 * Expose the plugin's start method for direct usage
 */
export default {
	start,
};
