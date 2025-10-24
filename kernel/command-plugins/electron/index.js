// File: electron/index.js

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Start the Electron plugin by launching electron-main.js via npx
 * @returns {Promise<void>}
 */
export async function start(commandRoot, servedUIDir, electronPreloadPath) {
	// Since Electron needs to be launched as a separate process, we spawn electron using npx
	// which will run electron-main.js. The electron-main.js will now use dynamic kernel loading.
	return import('child_process')
		.then(({ spawn }) => {
			// Launch electron with the electron-main.js file and pass the required paths as arguments
			const electronMainPath = path.join(__dirname, 'electron-main.js');

			const args = [
				'electron',
				electronMainPath,
				'--command-root',
				commandRoot,
			];

			// Add optional parameters if provided
			if (servedUIDir) {
				args.push('--servedui', servedUIDir);
			}
			if (electronPreloadPath) {
				args.push('--electron-preload-path', electronPreloadPath);
			}

			const npxProcess = spawn('npx', args, {
				stdio: 'inherit',
				cwd: process.cwd(),
				shell: true,
			});

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

export default {
	start,
};
