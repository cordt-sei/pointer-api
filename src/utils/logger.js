/**
 * Centralized logging utility with file rotation
 */
import fs from 'fs';
import path from 'path';

// Configuration with defaults
const LOG_LEVEL = process.env.LOG_LEVEL || 'INFO';
const LOG_FILE = process.env.LOG_FILE || '/var/log/pointer-api.log';
const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_LOG_FILES = 5; // Number of rotated files to keep

const levels = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3
};

// Check and rotate log if needed
function checkRotation() {
    try {
        if (fs.existsSync(LOG_FILE)) {
            const stats = fs.statSync(LOG_FILE);
            if (stats.size > MAX_LOG_SIZE) {
                // Rotate logs
                for (let i = MAX_LOG_FILES - 1; i > 0; i--) {
                    const oldFile = `${LOG_FILE}.${i}`;
                    const newFile = `${LOG_FILE}.${i + 1}`;
                    if (fs.existsSync(oldFile)) {
                        if (i === MAX_LOG_FILES - 1) {
                            // Delete the oldest log
                            fs.unlinkSync(oldFile);
                        } else {
                            fs.renameSync(oldFile, newFile);
                        }
                    }
                }
                // Rotate current log to .1
                fs.renameSync(LOG_FILE, `${LOG_FILE}.1`);
            }
        }
    } catch (error) {
        console.error(`Log rotation error: ${error.message}`);
    }
}

// Ensure log directory exists
try {
    const logDir = path.dirname(LOG_FILE);
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
    // Check if rotation is needed
    checkRotation();
} catch (error) {
    console.error(`Failed to setup log directory: ${error.message}`);
}

// Main logging function - keep the original API
export const log = globalThis.logFunction || function(level, message, data) {
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
        
        // Output to console
        if (level === 'ERROR') {
            console.error(consoleOutput, data || '');
        } else if (level === 'DEBUG') {
            if (LOG_LEVEL === 'DEBUG') {
                console.log(consoleOutput, data || '');
            }
        } else {
            console.log(consoleOutput, data || '');
        }
        
        // Write to log file
        try {
            // Check rotation again in case a log entry pushed the file over the limit
            checkRotation();
            fs.appendFileSync(LOG_FILE, JSON.stringify(logEntry) + '\n');
        } catch (error) {
            console.error(`Failed to write to log file: ${error.message}`);
        }
    }
};

// Function to capture all console output and route through our logger
export function setupConsoleCapture() {
    const originalConsole = {
        log: console.log,
        error: console.error,
        warn: console.warn
    };
    
    // Override console methods
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
    
    // Set up uncaught exception handler to log to file before crashing
    process.on('uncaughtException', (error) => {
        log('ERROR', 'UNCAUGHT EXCEPTION', {
            message: error.message,
            stack: error.stack
        });
        
        // Give log a chance to write before exiting
        setTimeout(() => {
            process.exit(1);
        }, 1000);
    });
    
    // Log unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
        log('ERROR', 'UNHANDLED PROMISE REJECTION', {
            reason: reason.toString(),
            stack: reason.stack
        });
    });
}

// If this module is the main module, set up console capture automatically
if (import.meta.url.endsWith('logger.js') && process.argv[1]?.endsWith('logger.js')) {
    setupConsoleCapture();
}
