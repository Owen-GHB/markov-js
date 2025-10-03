import { URL } from 'url';
import http from 'http';
import fs from 'fs';
import path from 'path';
import pathResolver from '../../utils/path-resolver.js';
import { CommandParser } from '../../CommandParser.js';
import { CommandHandler } from '../../CommandHandler.js';

// Load configuration from config directory using path resolver
let config = { defaultHttpPort: 8080 }; // fallback default
try {
  const configPath = pathResolver.getConfigFilePath('default.json');
  if (fs.existsSync(configPath)) {
    const configFile = fs.readFileSync(configPath, 'utf8');
    config = JSON.parse(configFile);
  }
} catch (error) {
  console.warn('⚠️ Could not load config file, using defaults:', error.message);
}

export class HTTPServer {
  constructor(options = {}) {
    this.port = options.port || config.defaultHttpPort || 8080;
    this.staticDir = options.staticDir || null;
    this.apiEndpoint = options.apiEndpoint || '/api';
    this.commandParser = new CommandParser();
    this.commandHandler = new CommandHandler();
  }

  start() {
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
        console.log(`   API available at: http://localhost:${this.port}${this.apiEndpoint}`);
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
        req.on('data', chunk => body += chunk);
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
              this.sendErrorResponse(res, "Missing 'command' in request body", 400);
            }
          } catch (err) {
            this.sendErrorResponse(res, `Invalid POST body: ${err.message}`, 400);
          }
        });
        return;
      }

      this.sendErrorResponse(res, 'Method not allowed', 405);
    } catch (err) {
      console.error("API handler error:", err);
      this.sendErrorResponse(res, `Internal server error: ${err.message}`, 500);
    }
  }

  async executeCommandAndRespond(commandString, res) {
    try {
      // First, try to parse as JSON command object (for backward compatibility)
      const jsonResult = await this.tryParseAsJsonCommand(commandString);
      if (jsonResult.handled) {
        return this.sendResponse(res, jsonResult.result);
      }

      // If not JSON, parse as command string using CommandParser
      const context = { 
        state: new Map(), // Use empty state map or get from state manager
        manifest: (await import('../../contract.js')).manifest 
      };
      const { error, command } = this.commandParser.parse(commandString, context);

      if (error) {
        return this.sendErrorResponse(res, error, 400);
      }

      // Execute the parsed command
      const result = await this.commandHandler.handleCommand(command);
      return this.sendResponse(res, result);
    } catch (err) {
      console.error("Command execution error:", err);
      return this.sendErrorResponse(res, err.message, 500);
    }
  }

  /**
   * Try to parse command string as JSON command object
   * @param {string} commandString - The command string to parse
   * @returns {Object} { handled: boolean, result: Object }
   */
  async tryParseAsJsonCommand(commandString) {
    try {
      const commandObj = JSON.parse(commandString);
      if (commandObj && typeof commandObj === 'object' && commandObj.name) {
        // This is a JSON command object, send directly to command handler
        const result = await this.commandHandler.handleCommand(commandObj);
        return { handled: true, result };
      }
    } catch (jsonError) {
      // Not a JSON command object, continue with command string parsing
    }
    return { handled: false };
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
      return this.sendErrorResponse(res, 'Static file serving not configured', 404);
    }

    // Check if the static directory exists and has index.html
    const indexPath = path.join(this.staticDir, 'index.html');
    if (!fs.existsSync(this.staticDir) || !fs.existsSync(indexPath)) {
      return this.sendErrorResponse(res, 
        `Directory '${this.staticDir}' does not exist or is missing index.html. Please generate UI files first using 'node kernel.js --generate'`, 
        404);
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
      '.ico': 'image/x-icon'
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