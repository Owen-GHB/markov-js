import { HTTPServer } from './HTTP-server.js';
import pathResolver from '../../utils/path-resolver.js';

export function startServeServer(port = 8080) {
  // Use the path resolver to get the served UI directory
  const staticDir = pathResolver.getServedUIDir();
  
  const server = new HTTPServer({
    port: port,
    staticDir: staticDir,
    apiEndpoint: '/api'
  });
  
  return server.start();
}