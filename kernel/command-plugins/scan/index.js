import { Scanner } from './Scanner.js';

let scannerInstance = null;

function getScannerInstance() {
    if (!scannerInstance) {
        scannerInstance = new Scanner();
    }
    return scannerInstance;
}

/**
 * Run the scanner plugin
 * @param {string} kernelPath - Path to kernel directory
 * @param {string} commandRoot - Command plugins root directory  
 * @param {string} projectRoot - Project root directory
 * @param {string} scannerOutputFile - Output file for scan results
 * @param {boolean} fix - Whether to automatically fix file organization issues
 * @param {string} scanDir - Directory to scan (optional, defaults to projectRoot)
 * @returns {Promise<string>}
 */
export async function run(kernelPath, commandRoot, projectRoot, scannerOutputFile, fix = false, scanDir = null) {
    const scanner = getScannerInstance();
    
    // Use scanDir if provided, otherwise use projectRoot
    const targetScanDir = scanDir ? path.resolve(projectRoot, scanDir) : projectRoot;
    
    return await scanner.run(kernelPath, commandRoot, targetScanDir, scannerOutputFile, fix);
}

export default {
    run,
};