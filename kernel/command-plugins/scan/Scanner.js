import { loadScanners } from './scanners/index.js';
import { IssueReporter } from './utils/IssueReporter.js';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

export class Scanner {
    constructor() {
        this.issueReporter = new IssueReporter();
        this.scanners = [];
    }

    async run(kernelPath, commandRoot, scanDir, scannerOutputFile, fix = false) {
        try {
            // Validate scan directory exists
            if (!fs.existsSync(scanDir)) {
                return {
                    error: `Scan directory not found: ${scanDir}`,
                    issueCount: 0,
                    issues: []
                };
            }

            // Load all available scanner modules
            this.scanners = await loadScanners();
            
            // Load manifest using the standard loader
            const manifest = await this.loadManifest(kernelPath, scanDir);
            
            // Perform scan with all scanners
            await this.performScan(manifest, scanDir, fix);
            
            // Generate report (relative to the scanned directory)
            const outputPath = await this.generateReport(scanDir, scannerOutputFile);
            
            return {
                issueCount: this.issueReporter.getIssueCount(),
                issues: this.issueReporter.getIssues(),
                output: `Scan complete. Found ${this.issueReporter.getIssueCount()} issues. Report: ${outputPath}`
            };
            
        } catch (error) {
            return {
                error: `Scanner failed: ${error.message}`,
                issueCount: 0,
                issues: []
            };
        }
    }

    async performScan(manifest, scanDir, fix) {
        console.log(`Scanning directory: ${scanDir}${fix ? ' with auto-fix' : ''}`);
        
        // Run each scanner with the manifest
        for (const scanner of this.scanners) {
            console.log(`Running scanner: ${scanner.name}`);
            await scanner.scan(manifest, scanDir, this.issueReporter, fix);
        }
    }
    
    async loadManifest(kernelPath, scanDir) {
        const manifestUrl = pathToFileURL(path.join(kernelPath, 'contract.js')).href;
        const { manifestReader } = await import(manifestUrl);
        return manifestReader(scanDir);
    }

    async generateReport(scanDir, scannerOutputFile) {
        const outputPath = path.resolve(scanDir, scannerOutputFile);
        const report = this.issueReporter.generateMarkdownReport();
        
        // Ensure directory exists and write report
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        fs.writeFileSync(outputPath, report, 'utf8');
        return outputPath;
    }
}