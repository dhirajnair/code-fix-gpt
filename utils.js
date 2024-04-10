const fs = require('fs');
const path = require('path');

class CustomLogger {
    constructor(logFile) {
        this.logFile = logFile;
    }

    log(...args) {
        fs.appendFileSync(this.logFile, args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ') + '\n');
        //console.log(...args); // Optionally print to stdout
    }

    error(...args) {
        fs.appendFileSync(this.logFile, args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : arg).join(' ') + '\n');
        //console.error(...args); // Optionally print to stderr
    }
}

// Export CustomLogger
module.exports = { CustomLogger };