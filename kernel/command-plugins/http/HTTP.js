import { URL } from 'url';
import http from 'http';
import fs from 'fs';
import path from 'path';
import busboy from 'busboy';

export class HTTPServer {
	constructor() {
		this.commandProcessor = null; // Will be initialized in start method
	}

	start(port, servedUIDir, apiEndpoint, commandProcessor, commandParser) {
		// Validate parameters
		if (typeof port !== 'number' || port <= 0) {
			throw new Error('port parameter must be a positive number');
		}

		if (servedUIDir && typeof servedUIDir !== 'string') {
			throw new Error('servedUIDir parameter must be a string if provided');
		}

		if (apiEndpoint && typeof apiEndpoint !== 'string') {
			throw new Error('apiEndpoint parameter must be a string if provided');
		}

		if (
			!commandProcessor ||
			typeof commandProcessor.processCommand !== 'function'
		) {
			throw new Error(
				'commandProcessor parameter must be a valid command processor instance',
			);
		}

		// Initialize properties with explicit parameters
		this.port = port;
		this.staticDir = servedUIDir;
		this.apiEndpoint = apiEndpoint;
		this.commandProcessor = commandProcessor;
		this.commandParser = commandParser;

		return new Promise((resolve, reject) => {
			const server = http.createServer(async (req, res) => {
				// Add CORS headers
				res.setHeader('Access-Control-Allow-Origin', '*');
				res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
				res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

				if (req.method === 'OPTIONS') {
					res.writeHead(200);
					res.end();
					return;
				}

				// Route to API endpoint if matches
				if (req.url.startsWith(this.apiEndpoint)) {
					await this.handleAPIRequest(req, res);
					return;
				}

				// Serve static files if directory is configured
				if (this.staticDir) {
					await this.handleStaticRequest(req, res);
					return;
				}

				// Default to 404 if no static dir configured and not API
				res.writeHead(404, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify({ error: 'Not found' }));
			});

			server.listen(this.port, () => {
				console.log(`🔗 HTTP server running on port ${this.port}`);
				if (this.staticDir) {
					console.log(`   Serving static files from: ${this.staticDir}`);
				}
				console.log(
					`   API available at: http://localhost:${this.port}${this.apiEndpoint}`,
				);
				if (this.staticDir) {
					console.log(`   UI available at: http://localhost:${this.port}/`);
				}
				resolve(server);
			});

			server.on('error', (err) => {
				console.error('Server error:', err.message);
				reject(err);
			});
		});
	}

	async handleAPIRequest(req, res) {
		try {
			const parsedUrl = new URL(req.url, `http://${req.headers.host}`);

			// Handle multipart form data (file uploads)
			const contentType = req.headers['content-type'] || '';
			if (
				req.method === 'POST' &&
				contentType.includes('multipart/form-data')
			) {
				return await this.handleMultipartRequest(req, res);
			}

			let commandString;

			if (req.method === 'GET') {
				commandString = parsedUrl.searchParams.get('command');
				if (!commandString) {
					// Fallback to 'json' parameter to maintain backward compatibility
					commandString = parsedUrl.searchParams.get('json');
				}
				if (commandString) {
					return await this.executeCommandAndRespond(commandString, res);
				}
				// If no command parameter, return 400
				return this.sendErrorResponse(res, "Missing 'command' parameter", 400);
			}

			if (req.method === 'POST') {
				let body = '';
				req.on('data', (chunk) => (body += chunk));
				req.on('end', async () => {
					try {
						const contentType = req.headers['content-type'] || '';

						if (contentType.includes('application/x-www-form-urlencoded')) {
							const params = new URLSearchParams(body);
							commandString = params.get('command') || params.get('json'); // backward compatibility
						} else if (contentType.includes('application/json')) {
							const json = JSON.parse(body);
							commandString = json?.command || json?.json; // backward compatibility
						}

						if (commandString) {
							await this.executeCommandAndRespond(commandString, res);
						} else {
							this.sendErrorResponse(
								res,
								"Missing 'command' in request body",
								400,
							);
						}
					} catch (err) {
						this.sendErrorResponse(
							res,
							`Invalid POST body: ${err.message}`,
							400,
						);
					}
				});
				return;
			}

			this.sendErrorResponse(res, 'Method not allowed', 405);
		} catch (err) {
			console.error('API handler error:', err);
			this.sendErrorResponse(res, `Internal server error: ${err.message}`, 500);
		}
	}

	/**
	 * Handle multipart form data with file uploads
	 */
	async handleMultipartRequest(req, res) {
		return new Promise((resolve, reject) => {
			const bb = busboy({
				headers: req.headers,
				limits: {
					fileSize: 50 * 1024 * 1024, // 50MB limit
					files: 5, // Max 5 files
					fields: 20, // Max 20 fields
				},
			});

			const formData = {
				fields: {},
				files: [],
			};

			// Handle form fields
			bb.on('field', (name, value) => {
				formData.fields[name] = value;
			});

			// Handle file uploads
			bb.on('file', (name, file, info) => {
				const { filename, encoding, mimeType } = info;
				const chunks = [];

				file.on('data', (chunk) => {
					chunks.push(chunk);
				});

				file.on('end', () => {
					formData.files.push({
						fieldName: name,
						filename,
						mimeType,
						data: Buffer.concat(chunks),
						size: Buffer.concat(chunks).length,
					});
				});

				file.on('error', (err) => {
					console.error(`File upload error for ${filename}:`, err);
				});
			});

			// When all parts are processed
			bb.on('close', async () => {
				try {
					// Extract command from form fields
					const commandString = formData.fields.command || formData.fields.json;

					if (!commandString) {
						this.sendErrorResponse(
							res,
							"Missing 'command' field in form data",
							400,
						);
						return resolve();
					}

					// Convert files to blob format for your system
					const commandWithFiles = await this.injectFilesIntoCommand(
						commandString,
						formData.files,
					);

					// Execute the command
					await this.executeCommandAndRespond(commandWithFiles, res);
					resolve();
				} catch (error) {
					this.sendErrorResponse(
						res,
						`Error processing multipart request: ${error.message}`,
						500,
					);
					resolve();
				}
			});

			bb.on('error', (err) => {
				this.sendErrorResponse(
					res,
					`Multipart parsing error: ${err.message}`,
					400,
				);
				resolve();
			});

			// Pipe the request to busboy
			req.pipe(bb);
		});
	}

	/**
	 * Inject uploaded files into the command structure
	 */
	async injectFilesIntoCommand(commandString, files) {
		try {
			// Parse the original command
			const parsedCommand = this.commandParser.parse(commandString);

			if (parsedCommand.error) {
				throw new Error(parsedCommand.error);
			}

			// If no files, return original command
			if (files.length === 0) {
				return commandString;
			}

			// Get command specification to understand expected parameters
			const commandName = parsedCommand.command.name;
			const commandSpec = this.commandProcessor
				.getManifest()
				.commands[commandName];

			if (!commandSpec) {
				throw new Error(`Unknown command: ${commandName}`);
			}

			// Create file data based on parameter type
			const fileDataMap = new Map();
			const fileParametersWithType = Object.entries(
				commandSpec.parameters || {},
			)
				.filter(
					([paramName, paramSpec]) =>
						paramSpec.type &&
						(paramSpec.type.includes('blob') ||
							paramSpec.type.includes('buffer')),
				)
				.map(([paramName, paramSpec]) => ({
					name: paramName,
					type: paramSpec.type,
				}));

			if (fileParametersWithType.length === 0) {
				throw new Error(
					`Command '${commandName}' does not accept file uploads, but ${files.length} file(s) were provided`,
				);
			}

			// Validate file/parameter count mismatch
			if (files.length !== fileParametersWithType.length) {
				const expectedTypes = fileParametersWithType.map(
					(p) => `${p.name} (${p.type.includes('buffer') ? 'buffer' : 'blob'})`,
				);
				throw new Error(
					`File parameter mismatch: command '${commandName}' expects ` +
						`${fileParametersWithType.length} file parameter(s) but received ${files.length} file(s). ` +
						`Expected parameters: ${expectedTypes.join(', ')}`,
				);
			}

			// Handle single parameter with multiple files (not allowed for either blob or buffer)
			const hasSingleFileParam = fileParametersWithType.length === 1;

			if (files.length > 1 && hasSingleFileParam) {
				const paramType = fileParametersWithType[0].type.includes('buffer') ? 'buffer' : 'blob';
				throw new Error(
					`${paramType.charAt(0).toUpperCase() + paramType.slice(1)} parameter '${fileParametersWithType[0].name}' cannot accept multiple files. ` +
					`Received ${files.length} files but only one ${paramType} parameter expected.`,
				);
			}

			// Now create the file data
			files.forEach((file, index) => {
				const paramInfo = fileParametersWithType[index];
				if (!paramInfo) return;

				if (paramInfo.type.includes('buffer')) {
					// For buffer: just the raw Buffer data, no metadata
					fileDataMap.set(paramInfo.name, file.data);
				} else {
					// For blob: full metadata object
					fileDataMap.set(paramInfo.name, {
						type: 'blob',
						name: file.filename,
						mimeType: file.mimeType,
						data: file.data,
						size: file.size,
						encoding: file.encoding || 'binary',
					});
				}
			});

			// Inject files
			for (const [paramName, fileData] of fileDataMap) {
				parsedCommand.command.args[paramName] = fileData;
			}
			// Convert back to string for execution
			return JSON.stringify(parsedCommand.command);
		} catch (error) {
			throw new Error(`Failed to inject files into command: ${error.message}`);
		}
	}

	async executeCommandAndRespond(commandString, res) {
		try {
			// Process command using the shared processor
			const parsedCommand = this.commandParser.parse(commandString);
			let result;
			if (parsedCommand.error) {
				result = parsedCommand;
			} else {
				const command = parsedCommand.command;
				result = await this.commandProcessor.processStatefulCommand(command);
			}
			return this.sendResponse(res, result);
		} catch (err) {
			console.error('Command execution error:', err);
			return this.sendErrorResponse(res, err.message, 500);
		}
	}

	/**
	 * Send a response with appropriate status code
	 * @param {Object} res - HTTP response object
	 * @param {Object} result - Command result object
	 * @param {number} defaultStatusCode - Default status code if not in result
	 */
	sendResponse(res, result) {
		if (result.error) {
			return this.sendErrorResponse(res, result.error, 400);
		}

		res.writeHead(200, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify(result));
	}

	/**
	 * Send an error response
	 * @param {Object} res - HTTP response object
	 * @param {string} errorMessage - Error message
	 * @param {number} statusCode - HTTP status code
	 */
	sendErrorResponse(res, errorMessage, statusCode = 400) {
		res.writeHead(statusCode, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({ error: errorMessage }));
	}

	async handleStaticRequest(req, res) {
		// Check if static directory is configured
		if (!this.staticDir) {
			return this.sendErrorResponse(
				res,
				'Static file serving not configured',
				404,
			);
		}

		// Check if the static directory exists and has index.html
		const indexPath = path.join(this.staticDir, 'index.html');
		if (!fs.existsSync(this.staticDir) || !fs.existsSync(indexPath)) {
			return this.sendErrorResponse(
				res,
				`Directory '${this.staticDir}' does not exist or is missing index.html. Please generate UI files first using 'node kernel.js --generate'`,
				404,
			);
		}

		// Remove query parameters and normalize path
		const url = new URL(req.url, `http://${req.headers.host}`);
		let filePath = url.pathname;

		// Default to index.html for root path
		if (filePath === '/' || filePath === '') {
			filePath = '/index.html';
		}

		// Resolve to absolute path and prevent directory traversal
		const safePath = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, '');
		const fullPath = path.join(this.staticDir, safePath);

		// Check if the requested path is within the static directory
		if (!fullPath.startsWith(this.staticDir)) {
			res.writeHead(403, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify({ error: 'Forbidden' }));
			return;
		}

		// Check if file exists
		if (!fs.existsSync(fullPath)) {
			// Try index.html for SPA routing
			const indexPath = path.join(this.staticDir, 'index.html');
			if (fs.existsSync(indexPath)) {
				this.serveFile(indexPath, res);
				return;
			}

			res.writeHead(404, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify({ error: 'File not found' }));
			return;
		}

		this.serveFile(fullPath, res);
	}

	serveFile(filePath, res) {
		const ext = path.extname(filePath).toLowerCase();
		const contentType = this.getContentType(ext);

		fs.readFile(filePath, (err, content) => {
			if (err) {
				res.writeHead(500);
				res.end('Server Error');
			} else {
				res.writeHead(200, { 'Content-Type': contentType });
				res.end(content);
			}
		});
	}

	getContentType(ext) {
		const types = {
			'.html': 'text/html',
			'.css': 'text/css',
			'.js': 'application/javascript',
			'.json': 'application/json',
			'.png': 'image/png',
			'.jpg': 'image/jpeg',
			'.jpeg': 'image/jpeg',
			'.gif': 'image/gif',
			'.svg': 'image/svg+xml',
			'.ico': 'image/x-icon',
		};
		return types[ext] || 'application/octet-stream';
	}

	async respond(jsonString, res) {
		if (typeof jsonString === 'undefined') {
			res.writeHead(400, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify({ error: "Missing 'json' parameter" }));
			return;
		}

		try {
			const result = await this.apiHandler.handleInput(jsonString);

			if (result.error) {
				res.writeHead(400, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify({ error: result.error }));
				return;
			}

			res.writeHead(200, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify(result));
		} catch (err) {
			res.writeHead(500, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify({ error: err.message }));
		}
	}
}
