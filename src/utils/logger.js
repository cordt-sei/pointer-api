// Keep a reference to the original console methods
const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn
};

// Main logging function
export function log(level, message, data = null) {
    if (levels[level] >= levels[LOG_LEVEL]) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message,
            data: data || undefined
        };
        
        // Format console output
        let consoleOutput = `[${timestamp}] [${level}] ${message}`;
        
        // Use originalConsole instead of console
        if (level === 'ERROR') {
            originalConsole.error(consoleOutput, data || '');
        } else if (level === 'DEBUG') {
            if (LOG_LEVEL === 'DEBUG') {
                originalConsole.log(consoleOutput, data || '');
            }
        } else {
            originalConsole.log(consoleOutput, data || '');
        }
        
        // Write to log file
        try {
            checkRotation();
            fs.appendFileSync(LOG_FILE, JSON.stringify(logEntry) + '\n');
        } catch (error) {
            originalConsole.error(`Failed to write to log file: ${error.message}`);
        }
    }
}

// Console capture function
export function setupConsoleCapture() {
    // Actual console overriding happens here
    console.log = function(...args) {
        const message = args.length > 0 ? args[0] : '';
        const data = args.length > 1 ? args.slice(1) : null;
        log('INFO', message, data);
    };
    
    console.error = function(...args) {
        const message = args.length > 0 ? args[0] : '';
        const data = args.length > 1 ? args.slice(1) : null;
        log('ERROR', message, data);
    };
    
    console.warn = function(...args) {
        const message = args.length > 0 ? args[0] : '';
        const data = args.length > 1 ? args.slice(1) : null;
        log('WARN', message, data);
    };
    
    // Exception handlers here...
}
