import express from 'express';
import { determineAssetProperties } from './src/utils/determineProps.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3003;

// Logging configuration
const LOG_LEVEL = process.env.LOG_LEVEL || 'INFO'; // DEBUG, INFO, WARN, ERROR
const LOG_FILE = process.env.LOG_FILE || '/var/log/pointer-api.log';

// Enable debugging logs if log level is DEBUG
const DEBUG = LOG_LEVEL === 'DEBUG';

// Ensure log directory exists
const logDir = path.dirname(LOG_FILE);
if (!fs.existsSync(logDir)) {
    try {
        fs.mkdirSync(logDir, { recursive: true });
    } catch (error) {
        // Use console.error here since logging system isn't initialized yet
        console.error(`Failed to create log directory (${logDir}):`, error.message);
    }
}

// Create the log function and expose it globally for modules to use
globalThis.logFunction = function log(level, message, data = null) {
    const levels = {
        DEBUG: 0,
        INFO: 1,
        WARN: 2,
        ERROR: 3
    };
    
    // Only log if the current log level is less than or equal to the configured level
    if (levels[level] >= levels[LOG_LEVEL]) {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            message,
            data: data || undefined
        };
        
        // Log to console
        console.log(JSON.stringify(logEntry));
        
        // Log to file
        try {
            fs.appendFileSync(LOG_FILE, JSON.stringify(logEntry) + '\n');
        } catch (error) {
            // Use console.error here since it's an error with the logging system itself
            console.error(`Failed to write to log file (${LOG_FILE}):`, error.message);
        }
    }
};

// Get a reference to the logging function
const log = globalThis.logFunction;

app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
    const start = Date.now();
    
    // Generate a unique request ID
    const requestId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    req.requestId = requestId;
    
    // Log request details
    const requestData = {
        requestId,
        method: req.method,
        url: req.originalUrl,
        ip: req.ip || req.connection.remoteAddress,
        headers: req.headers
    };
    
    // For DEBUG level, include request body
    if (LOG_LEVEL === 'DEBUG' && req.method !== 'GET') {
        requestData.body = req.body;
    }
    
    log('INFO', `Request received: ${req.method} ${req.originalUrl}`, requestData);
    
    // Capture response data
    const originalSend = res.send;
    res.send = function(body) {
        res.responseBody = body;
        return originalSend.call(this, body);
    };
    
    // Log after response is sent
    res.on('finish', () => {
        const duration = Date.now() - start;
        const responseData = {
            requestId,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
            contentLength: res.get('Content-Length') || 0
        };
        
        // For DEBUG level, include response body if it's not too large
        if (LOG_LEVEL === 'DEBUG' && res.responseBody) {
            try {
                // If it's a JSON string, parse it first
                let responseBody = res.responseBody;
                if (typeof responseBody === 'string') {
                    responseBody = JSON.parse(responseBody);
                }
                
                // Only include full response for reasonably sized responses
                if (JSON.stringify(responseBody).length < 10000) {
                    responseData.body = responseBody;
                } else {
                    responseData.body = '[Response too large to log]';
                }
            } catch (error) {
                responseData.body = '[Error parsing response body]';
            }
        }
        
        const logLevel = res.statusCode >= 400 ? 'ERROR' : 'INFO';
        log(logLevel, `Response sent: ${req.method} ${req.originalUrl} ${res.statusCode}`, responseData);
    });
    
    next();
});

// Helper function to validate address format
function isValidAddress(address) {
    // Check if the address starts with any of the expected prefixes
    // and doesn't contain certain patterns that would indicate it's not a valid address
    const validPrefixes = ['0x', 'sei1', 'ibc/', 'factory/'];
    const hasValidPrefix = validPrefixes.some(prefix => address.startsWith(prefix));
    
    // Check for invalid patterns (possibly from incorrect or unconventional query method)
    const hasInvalidPattern = address.includes('=') || 
                              address.includes('[') || 
                              address.includes(']') || 
                              address.includes('{') || 
                              address.includes('}');
    
    return hasValidPrefix && !hasInvalidPattern;
}

// Standardized error message for invalid address format
const INVALID_ADDRESS_ERROR = {
    error: 'Invalid address format. Use GET for a single address or POST for multiple addresses.',
    details: 'For multiple addresses, use the POST endpoint with a JSON body containing an "addresses" array.'
};

// Standardized error message for API errors
const API_ERROR = {
    error: 'API error occurred while processing the request',
    details: 'Please open an issue at: https://github.com/cordt-sei/pointer-api/issues'
};

// Standardized error message for rate limiting
const RATE_LIMIT_ERROR = {
    error: 'Rate limit exceeded. Please try again later.',
    details: 'If this issue persists, please open an issue at: https://github.com/cordt-sei/pointer-api/issues'
};

// Route to handle GET requests with an address parameter
app.get('/:address', async (req, res) => {
    try {
        let { address } = req.params;
        log('DEBUG', `Processing GET request for address`, { 
            requestId: req.requestId,
            address 
        });

        if (!address) {
            return res.status(400).json({ error: 'Address parameter is required.' });
        }

        // Decode URL-encoded characters (e.g., %2F → /)
        address = decodeURIComponent(address);
        log('DEBUG', `Decoded address for processing`, { 
            requestId: req.requestId,
            address 
        });

        // Validate address format
        if (!isValidAddress(address)) {
            log('WARN', `Invalid address format rejected`, { 
                requestId: req.requestId,
                address 
            });
            return res.status(400).json(INVALID_ADDRESS_ERROR);
        }

        // Process the address and determine asset properties
        log('INFO', `Determining asset properties for address`, { 
            requestId: req.requestId,
            address 
        });
        
        const result = await determineAssetProperties(address);

        log('DEBUG', `Processed address result`, { 
            requestId: req.requestId,
            address, 
            result 
        });

        // Check if there was an error in the result
        if (result.error) {
            log('ERROR', `Error processing address`, { 
                requestId: req.requestId,
                address,
                error: result.error 
            });
            
            return res.status(404).json({ error: result.error });
        }

        res.json(result);
    } catch (error) {
        log('ERROR', 'Error processing GET request', { 
            requestId: req.requestId,
            address: req.params.address,
            error: error.message,
            stack: error.stack
        });

        // Handle rate limiting specifically
        if (error.response && error.response.status === 429) {
            return res.status(429).json(RATE_LIMIT_ERROR);
        }

        // Generic error handler
        res.status(500).json({
            ...API_ERROR,
            message: error.message
        });
    }
});

// Route to handle POST requests for multiple addresses
app.post('/', async (req, res) => {
    try {
        const { address, addresses } = req.body;
        let addressList = [];

        // Check if a single address or a list of addresses is provided
        if (address) {
            addressList = [address];
        } else if (Array.isArray(addresses)) {
            addressList = addresses;
        } else {
            log('WARN', `Invalid POST request - missing address/addresses`, { 
                requestId: req.requestId,
                body: req.body 
            });
            
            return res.status(400).json({
                error: 'Request must include either "address" or an array called "addresses".',
                details: 'Example valid requests:\n{ "address": "singleAddress" }\n{ "addresses": ["addressOne", "addressTwo"] }',
                received: req.body
            });
        }

        log('DEBUG', `Processing POST request for addresses`, { 
            requestId: req.requestId,
            addressCount: addressList.length, 
            addresses: addressList 
        });

        // Validate addresses
        if (addressList.length === 0) {
            log('WARN', `Empty address list in POST request`, { 
                requestId: req.requestId 
            });
            
            return res.status(400).json({ error: 'No addresses provided.' });
        }

        // Validate each address format
        const invalidAddresses = addressList.filter(addr => !isValidAddress(addr));
        if (invalidAddresses.length > 0) {
            log('WARN', `Invalid addresses found in POST request`, { 
                requestId: req.requestId,
                invalidAddresses 
            });
            
            return res.status(400).json({ 
                error: 'Invalid address format detected in the request.', 
                invalidAddresses
            });
        }

        // Process each address and determine asset properties
        try {
            log('INFO', `Processing batch of ${addressList.length} addresses`, { 
                requestId: req.requestId 
            });
            
            const results = await Promise.all(
                addressList.map(async (addr) => {
                    try {
                        log('DEBUG', `Processing address in batch`, { 
                            requestId: req.requestId,
                            address: addr 
                        });
                        
                        return await determineAssetProperties(addr);
                    } catch (addrError) {
                        log('ERROR', `Error processing individual address in batch`, { 
                            requestId: req.requestId,
                            address: addr, 
                            error: addrError.message,
                            stack: addrError.stack
                        });
                        
                        return {
                            address: addr,
                            error: 'Failed to process address: ' + addrError.message,
                            isBaseAsset: null,
                            isPointer: null,
                            pointerType: null,
                            pointerAddress: null,
                            pointeeAddress: null
                        };
                    }
                })
            );

            log('DEBUG', `Processed POST request results`, { 
                requestId: req.requestId,
                addressCount: addressList.length,
                successCount: results.filter(r => !r.error).length,
                errorCount: results.filter(r => r.error).length,
                results: LOG_LEVEL === 'DEBUG' ? results : undefined
            });

            // Return a single object for a single address, or an array for multiple addresses
            res.json(addressList.length === 1 ? results[0] : results);
        } catch (error) {
            log('ERROR', 'Error processing batch of addresses', {
                requestId: req.requestId,
                addressCount: addressList.length,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    } catch (error) {
        log('ERROR', 'Error processing POST request', {
            requestId: req.requestId,
            error: error.message,
            stack: error.stack
        });

        // Handle rate limiting specifically
        if (error.response && error.response.status === 429) {
            return res.status(429).json(RATE_LIMIT_ERROR);
        }

        // Generic error handler
        res.status(500).json({
            ...API_ERROR,
            message: error.message
        });
    }
});

// Add a specific catch-all route for invalid paths that might look like query parameters
app.get('/*', (req, res) => {
    log('WARN', `Invalid GET request path`, { 
        requestId: req.requestId,
        path: req.path 
    });
    
    res.status(400).json(INVALID_ADDRESS_ERROR);
});

// Start the server
app.listen(PORT, () => {
    log('INFO', `API server running at http://localhost:${PORT}`, {
        port: PORT,
        logLevel: LOG_LEVEL,
        logFile: LOG_FILE,
        nodeVersion: process.version,
        nodeEnv: process.env.NODE_ENV || 'development'
    });
});