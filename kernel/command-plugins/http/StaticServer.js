import fs from 'fs';
import path from 'path';

export class StaticServer {
	constructor(servedUIDir) {
		this.staticDir = servedUIDir;
	}

	/**
	 * Check if static directory exists and has index.html
	 */
	hasStaticFiles() {
		const indexPath = path.join(this.staticDir, 'index.html');
		return fs.existsSync(this.staticDir) && fs.existsSync(indexPath);
	}

	/**
	 * Get error message if static files are missing
	 */
	getMissingStaticFilesError() {
		return `Directory '${this.staticDir}' does not exist or is missing index.html. Please generate UI files first using 'node kernel.js --generate'`;
	}

	/**
	 * Handle static file request
	 */
	async handleStaticRequest(req, res) {
		// Check if static directory is configured
		if (!this.staticDir) {
			this.sendErrorResponse(res, 'Static file serving not configured', 404);
			return;
		}

		// Check if the static directory exists and has index.html
		if (!this.hasStaticFiles()) {
			this.sendErrorResponse(res, this.getMissingStaticFilesError(), 404);
			return;
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
			this.sendErrorResponse(res, 'Forbidden', 403);
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

			this.sendErrorResponse(res, 'File not found', 404);
			return;
		}

		this.serveFile(fullPath, res);
	}

	/**
	 * Serve a single file
	 */
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

	/**
	 * Get content type for file extension
	 */
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

	/**
	 * Send error response
	 */
	sendErrorResponse(res, errorMessage, statusCode = 400) {
		res.writeHead(statusCode, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({ error: errorMessage }));
	}
}
