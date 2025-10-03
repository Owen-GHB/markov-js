import { HTTPServer } from './HTTP-server.js';

// Start HTTP server on specified port - maintains original functionality
export function startServer(port = 8080) {
  const server = new HTTPServer({
    port: port,
    apiEndpoint: '/' // Serve API directly at root (original behavior)
  });
  
  return server.start();
}