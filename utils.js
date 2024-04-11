const fs = require('fs');
const path = require('path');

class CustomLogger {
    constructor(logFile) {
        this.logFile = logFile;
    }

    // Helper method to format the current timestamp
    formatTimestamp() {
        return new Date().toISOString();
    }

    log(...args) {
        const timestamp = this.formatTimestamp();
        const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
        fs.appendFileSync(this.logFile, `${timestamp} ${message}\n`);
        // Optionally print to stdout
        // console.log(`${timestamp} ${message}`);
    }

    error(...args) {
        const timestamp = this.formatTimestamp();
        const message = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ');
        fs.appendFileSync(this.logFile, `${timestamp} ${message}\n`);
        // Optionally print to stderr
        // console.error(`${timestamp} ${message}`);
    }
}

// Export CustomLogger
module.exports = { CustomLogger };