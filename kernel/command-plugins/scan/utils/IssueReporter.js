export class IssueReporter {
    constructor() {
        this.issues = [];      // Real problems (warnings/errors)
        this.info = [];        // Informational messages
    }

    addIssue(issue) {
        if (issue.severity === 'info') {
            this.info.push({
                timestamp: new Date().toISOString(),
                ...issue
            });
        } else {
            this.issues.push({
                timestamp: new Date().toISOString(),
                ...issue
            });
        }
    }

    getIssues() {
        return this.issues;  // Only real problems
    }

    getInfo() {
        return this.info;    // Informational messages
    }

    getIssueCount() {
        return this.issues.length;  // Only count warnings/errors
    }

    generateMarkdownReport() {
        let report = `# Contract Scan Report\n\n`;
        report += `**Generated:** ${new Date().toISOString()}\n`;
        report += `**Issues Found:** ${this.getIssueCount()}\n\n`;
        
        // Only show issues section if there are actual issues
        if (this.issues.length > 0) {
            report += `## Issues\n\n`;
            this.issues.forEach(issue => {
                report += `### ${issue.severity.toUpperCase()}: ${issue.message}\n`;
                if (issue.suggestion) report += `**Suggestion:** ${issue.suggestion}\n`;
                report += `\n`;
            });
        } else {
            report += `## ✅ No issues found!\n\n`;
        }
        
        // Show informational summary
        if (this.info.length > 0) {
            report += `## Summary\n\n`;
            this.info.forEach(info => {
                report += `- ${info.message}\n`;
            });
        }
        
        return report;
    }
}