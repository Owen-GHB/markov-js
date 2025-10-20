// File: imports.js (for all transports)

import path from 'path';
import { pathToFileURL } from 'url';

/**
 * Dynamic importer for the Vertex dependency container class
 * @param {string} kernelPath - Path to the kernel directory
 * @returns {Promise<typeof import('../exports.js').Vertex>} The Vertex class
 */
export async function importVertex(kernelPath) {
  // Proper path resolution
  const exportsPath = path.join(kernelPath, 'exports.js');
  const exportsUrl = pathToFileURL(exportsPath).href;
  
  // Dynamic import
  const { Vertex } = await import(exportsUrl);
  return Vertex;
}