import { URL } from 'url';
import http from 'http';
import busboy from 'busboy';
import { StaticServer } from './StaticServer.js';

export class HTTPServer {
	constructor() {
		this.vertex = null;
		this.staticServer = null;
	}

	start(port, servedUIDir, apiEndpoint, vertex) {
		// Initialize properties with explicit parameters
		this.port = port;
		this.staticDir = servedUIDir;
		this.apiEndpoint = apiEndpoint;
		this.vertex = vertex;
		this.staticServer = new StaticServer(servedUIDir);

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
					await this.staticServer.handleStaticRequest(req, res);
					return;
				}

				// Default to 404 if no static dir configured and not API
				res.writeHead(404, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify({ error: 'Not found' }));
			});

			server.listen(this.port, () => {
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
					commandString = parsedUrl.searchParams.get('json');
				}
				if (commandString) {
					try {
						// Parse JSON command object
						const result = await this.vertex.executeCommand(commandString);
						this.sendSuccessResponse(res, result);
					} catch (err) {
						this.sendErrorResponse(res, err, 500);
					}
					return;
				}
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
							commandString = params.get('command') || params.get('json');
						} else if (contentType.includes('application/json')) {
							const json = JSON.parse(body);
							commandString = json?.command || json?.json;
						}

						if (commandString) {
							try {
								const result = await this.vertex.executeCommand(commandString);
								this.sendSuccessResponse(res, result);
							} catch (err) {
								this.sendErrorResponse(res, err, 500);
							}
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
					const commandString = formData.fields.command || formData.fields.json;

					if (!commandString) {
						this.sendErrorResponse(
							res,
							"Missing 'command' field in form data",
							400,
						);
						return resolve();
					}

					// Build file args
					const fileArgs = {};
					formData.files.forEach((file) => {
						fileArgs[file.fieldName] = file.data;
					});

					// Create array input: [commandString, fileArgs] for parseInput to merge
					const commandInput = [commandString, fileArgs];

					try {
						const result = await this.vertex.executeCommand(commandInput);
						this.sendSuccessResponse(res, result);
					} catch (err) {
						this.sendErrorResponse(res, err, 500);
					}
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
	 * Send a response with appropriate status code
	 * @param {Object} res - HTTP response object
	 * @param {Object} output - Command result object
	 * @param {number} defaultStatusCode - Default status code if not in result
	 */
	sendSuccessResponse(res, output) {
		const result = {
			output: output,
			error: null,
		};
		res.writeHead(200, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify(result));
	}

	/**
	 * Send an error response
	 * @param {Object} res - HTTP response object
	 * @param {string} error - Error message
	 * @param {number} statusCode - HTTP status code
	 */
	sendErrorResponse(res, error, statusCode = 400) {
		const result = {
			output: null,
			error: error.message || error,
		};
		res.writeHead(statusCode, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify(result));
	}
}
