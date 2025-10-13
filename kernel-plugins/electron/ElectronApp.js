import { app, BrowserWindow, ipcMain } from 'electron';
import fs from 'fs';
import path from 'path';

/**
 * Manages the UI for the Electron application, including checking and loading
 */
class ElectronUIManager {
	/**
	 * Check if the served UI directory exists and has required files
	 * @param {string} filename - The UI filename to check (default: 'index.html')
	 * @param {Object} paths - Paths object containing required paths
	 * @returns {boolean} True if the served UI directory exists and has the file
	 */
	hasServedUI(filename = 'index.html', servedUIDir) {
		const servedDir = servedUIDir;
		const indexPath = path.join(servedDir, filename);
		return fs.existsSync(servedDir) && fs.existsSync(indexPath);
	}

	/**
	 * Get the UI file path from the served UI directory
	 * @param {string} filename - The UI filename (default: 'index.html')
	 * @param {Object} paths - Paths object containing required paths
	 * @returns {string} The path to the UI file
	 */
	getUIPath(filename = 'index.html', servedUIDir) {
		const servedDir = servedUIDir;
		return path.join(servedDir, filename);
	}
}

/**
 * Handles commands for the Electron application via IPC
 */
class ElectronCommandHandler {
	constructor(commandProcessor) {
		this.commandProcessor = commandProcessor;
	}

	/**
	 * Execute a command through the kernel
	 * @param {Object} command - The command to execute
	 * @returns {Promise<Object>} - The result of the command execution
	 */
	async executeCommand(command) {
		try {
			// The command from UI is already parsed as an object
			// We'll pass it through the processor to handle state management properly
			// Convert command object to expected format for processCommand if needed
			const commandString = JSON.stringify(command);
			const result = await this.commandProcessor.processCommand(commandString);
			return result;
		} catch (error) {
			return { error: error.message, output: null };
		}
	}
}

export class ElectronApp {
	constructor(options = {}) {
		this.uiManager = new ElectronUIManager();
		this.commandHandler = null; // Will be initialized in start method
		this.options = options;
		this.windowOptions = {
			width: options.width || 1200,
			height: options.height || 800,
			webPreferences: {
				nodeIntegration: false,
				contextIsolation: true,
				preload: options.preloadPath || null, // Will be set in start method
			},
			...options.windowOptions,
		};
		this.showDevTools = options.showDevTools !== false; // Default to true unless explicitly disabled
	}

	createWindow() {
		const mainWindow = new BrowserWindow(this.windowOptions);

		// Check if UI exists first, refuse to work if not
		if (!this.uiManager.hasServedUI('index.html', this.paths.servedUIDir)) {
			console.error(
				"UI files not found. Please generate UI files first using 'node kernel.js --generate'",
			);
			// Show error and close the window
			mainWindow.loadURL(
				`data:text/html,<h1>UI Files Not Found</h1><p>Please generate UI files first using 'node kernel.js --generate'</p><p>The Electron app will close in 5 seconds.</p>`,
			);

			// Close the window after a delay to let the user see the error
			setTimeout(() => {
				mainWindow.close();
				if (BrowserWindow.getAllWindows().length === 0) {
					app.quit();
				}
			}, 5000);

			return mainWindow;
		}

		// Load the UI from the served UI directory
		try {
			const uiPath = this.uiManager.getUIPath('index.html', this.paths.servedUIDir);
			// Load the generated UI
			mainWindow.loadFile(uiPath);
		} catch (err) {
			console.error('Failed to load UI:', err);
			// Load an error page
			mainWindow.loadURL(
				`data:text/html,<h1>UI Loading Failed</h1><p>${err.message}</p>`,
			);
		}

		// Open the DevTools if specified
		if (this.showDevTools) {
			mainWindow.webContents.openDevTools();
		}

		return mainWindow;
	}

	setupIPC() {
		// IPC handler to execute commands via the kernel
		ipcMain.handle('execute-command', async (event, command) => {
			return await this.commandHandler.executeCommand(command);
		});
	}

	async start(config, commandProcessor) {
		// Validate config object
		if (!config || typeof config !== 'object') {
			throw new Error('config parameter must be an object');
		}

		if ( !commandProcessor ||
			typeof commandProcessor.processCommand !== 'function'
		) {
			throw new Error(
				'start method requires a valid commandProcessor with processCommand method',
			);
		}

		// Extract paths from nested config object
		const paths = config.paths || {};

		// Check if required paths are provided
		if (!paths.electronPreloadPath) {
			console.warn('⚠️ electronPreloadPath not provided');
		}

		// Store paths for use by UI manager methods
		this.paths = paths;

		// Initialize command handler
		this.commandHandler = new ElectronCommandHandler(commandProcessor);

		// Cache path resolver value at the beginning of start method
		const preloadPath = paths.electronPreloadPath;

		// Update the preload path in webPreferences
		this.windowOptions.webPreferences.preload =
			this.options.preloadPath || preloadPath;

		// Ensure preload script exists
		if (
			this.windowOptions.webPreferences.preload &&
			!fs.existsSync(this.windowOptions.webPreferences.preload)
		) {
			console.error(
				`Preload script not found at: ${this.windowOptions.webPreferences.preload}`,
			);
			console.error('This may cause IPC to not work properly.');
		}

		this.setupIPC();

		// This method will be called when Electron has finished
		// initialization and is ready to create browser windows.
		app.whenReady().then(() => {
			this.createWindow();

			app.on('activate', () => {
				// On macOS it's common to re-create a window in the app when the
				// dock icon is clicked and there are no other windows open.
				if (BrowserWindow.getAllWindows().length === 0) {
					this.createWindow();
				}
			});
		});

		// Quit when all windows are closed, except on macOS. There, it's common
		// for applications and their menu bar to stay active until the user quits
		// explicitly with Cmd + Q.
		app.on('window-all-closed', () => {
			if (process.platform !== 'darwin') {
				app.quit();
			}
		});
	}
}
