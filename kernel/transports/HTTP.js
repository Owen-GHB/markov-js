import { URL } from 'url';
import http from 'http';
import { JSONAPI } from './JSON.js';

let jsonAPI = new JSONAPI();

// Start HTTP server on specified port
export function startServer(port = 8080) {
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

    try {
      await handleApiRequest(req, res);
    } catch (err) {
      console.error("Server error:", err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: "Internal server error" }));
    }
  });

  server.listen(port, () => {
    console.log(`🔗 Markov HTTP API server running on port ${port}`);
    console.log(`💡 Usage examples:`);
    console.log(`   GET: http://localhost:${port}?json={"name":"listModels","args":{}}`);
    console.log(`   POST: Send JSON to http://localhost:${port}`);
  });

  server.on('error', (err) => {
    console.error('Server error:', err.message);
    process.exit(1);
  });

  return server;
}

async function processJSONInput(jsonString) {
  if (typeof jsonString === 'undefined' || jsonString === null) {
    return { error: "Missing 'json' parameter" };
  }
  
  try {
    const result = await jsonAPI.handleInput(jsonString);
    return { json: result };
  } catch (error) {
    return { error: error.message };
  }
}

async function handleApiRequest(req, res) {
  try {
    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    let jsonString;

    if (req.method === 'GET') {
      jsonString = parsedUrl.searchParams.get('json');
      return await respond(jsonString, res);
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

          await respond(jsonString, res);
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
    console.error("Unhandled API error:", err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: "Internal server error", details: err.message }));
  }
}

async function respond(jsonString, res) {
  if (typeof jsonString === 'undefined') {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: "Missing 'json' parameter" }));
    return;
  }

  const result = await processJSONInput(jsonString);

  if (result.error) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: result.error,
      ...(result.details && { details: result.details })
    }));
    return;
  }

  if (result.buffer) {
    res.writeHead(200, {
      'Content-Type': result.contentType,
      'Content-Length': result.buffer.length
    });
    res.end(result.buffer);
    return;
  }

  if (result.json) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result.json));
    return;
  }

  res.writeHead(500, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: "Unknown result from command handler" }));
}

export { handleApiRequest };
