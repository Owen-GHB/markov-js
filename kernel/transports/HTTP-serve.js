import { JSONAPI } from './JSON.js';
import { HTTPServer } from './HTTP-server.js';
import pathResolver from '../utils/path-resolver.js';

export function startServeServer(port = 8080) {
  const jsonAPI = new JSONAPI();
  
  // Use the path resolver to get the generated UI directory
  const staticDir = pathResolver.getGeneratedUIDir();
  
  const server = new HTTPServer({
    port: port,
    staticDir: staticDir,
    apiHandler: jsonAPI,
    apiEndpoint: '/api'
  });
  
  return server.start();
}