import { ContractScanner } from './ContractScanner.js';
import { PackageScanner } from './PackageScanner.js';
import { MethodScanner } from './MethodScanner.js';
import { FileOrgScanner } from './FileOrgScanner.js';

// List of scanner classes to instantiate
const SCANNER_CLASSES = [
    ContractScanner,
    PackageScanner,
    MethodScanner,
    FileOrgScanner,
    // Add future scanners here as they're implemented
];

export async function loadScanners() {
    const scanners = [];
    
    // Instantiate each scanner class
    for (const ScannerClass of SCANNER_CLASSES) {
        try {
            const scanner = new ScannerClass();
            scanners.push(scanner);
            console.log(`✅ Loaded scanner: ${scanner.name}`);
        } catch (error) {
            console.log(`❌ Failed to load scanner: ${error.message}`);
        }
    }
    
    return scanners;
}