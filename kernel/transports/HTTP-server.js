import { URL } from 'url';
import http from 'http';
import fs from 'fs';
import path from 'path';
import pathResolver from '../utils/path-resolver.js';

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
    this.apiHandler = options.apiHandler || null;
    this.apiEndpoint = options.apiEndpoint || '/api';
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
        if (this.apiHandler) {
          console.log(`   API available at: http://localhost:${this.port}${this.apiEndpoint}`);
        }
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
    if (!this.apiHandler) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'API not configured' }));
      return;
    }

    try {
      const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
      let jsonString;

      if (req.method === 'GET') {
        jsonString = parsedUrl.searchParams.get('json');
        return await this.respond(jsonString, res);
      }

      if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
          try {
            const contentType = req.headers['content-type'] || '';
            if (contentType.includes('application/x-www-form-urlencoded')) {
              const params = new URLSearchParams(body);
              jsonString = params.get('json');
            } else if (contentType.includes('application/json')) {
              const json = JSON.parse(body);
              jsonString = json?.json;
            }

            await this.respond(jsonString, res);
          } catch (err) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid POST body', details: err.message }));
          }
        });
        return;
      }

      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed' }));
    } catch (err) {
      console.error("API handler error:", err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: "Internal server error", details: err.message }));
    }
  }

  async handleStaticRequest(req, res) {
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