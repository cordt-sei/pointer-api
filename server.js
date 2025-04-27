import express from 'express';
import crypto from 'crypto';
import LRU from 'lru-cache';
import { determineAssetProperties } from './src/utils/determineProps.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { setupConsoleCapture, log } from './src/utils/logger.js';

// Setup console capture at the earliest point
setupConsoleCapture();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.set('trust proxy', true); // Trust X-Forwarded-* headers from Caddy
const PORT = process.env.PORT || 3003;

// Logging configuration
const LOG_LEVEL = process.env.LOG_LEVEL || 'INFO';
const LOG_FILE = process.env.LOG_FILE || '/var/log/pointer-api.log';
const DEBUG = LOG_LEVEL === 'DEBUG';

// Cache configuration - enables fast responses while reducing load
const CACHE_MAX_SIZE = parseInt(process.env.CACHE_MAX_SIZE) || 500;
const CACHE_TTL_MS = parseInt(process.env.CACHE_TTL_MS) || 300000; // 5 minutes

// Authorization configuration
const API_KEY_HEADER = process.env.API_KEY_HEADER || 'X-API-Key';
const AUTHORIZED_API_KEYS = (process.env.AUTHORIZED_API_KEYS || '').split(',').filter(Boolean);
const INTERNAL_IP_PREFIXES = (process.env.INTERNAL_IP_PREFIXES || '10.,192.168.,172.16.,172.17.,172.18.,172.19.,172.20.,172.21.,172.22.,172.23.,172.24.,172.25.,172.26.,172.27.,172.28.,172.29.,172.30.,172.31.,127.').split(',').filter(Boolean);
const cache = new LRU({
    max: CACHE_MAX_SIZE,
    ttl: CACHE_TTL_MS,
    updateAgeOnGet: true // Reset TTL when accessed
});

// Application startup log
log('INFO', 'API server initializing', {
    port: PORT,
    logLevel: LOG_LEVEL,
    logFile: LOG_FILE,
    nodeVersion: process.version,
    nodeEnv: process.env.NODE_ENV || 'development',
    cacheConfig: { maxSize: CACHE_MAX_SIZE, ttlMs: CACHE_TTL_MS },
    auth: {
        apiKeyHeader: API_KEY_HEADER,
        authorizedKeysCount: AUTHORIZED_API_KEYS.length,
        internalNetworkPrefixes: INTERNAL_IP_PREFIXES
    }
});

app.use(express.json({
    limit: '100kb', // Limit request body size for security
    strict: true    // Reject invalid JSON
}));

// Authorization middleware to check API keys and internal IPs
app.use((req, res, next) => {
    const apiKey = req.get(API_KEY_HEADER);
    const clientIp = req.ip || req.headers['x-real-ip'] || req.connection.remoteAddress || '';

    // Check if request is from internal network
    const isInternalRequest = INTERNAL_IP_PREFIXES.some(prefix =>
    clientIp.startsWith(prefix)
    );

    // Authorize if valid API key or internal request
    req.isAuthorized = (apiKey && AUTHORIZED_API_KEYS.includes(apiKey)) || isInternalRequest;

    if (isInternalRequest) {
        log('DEBUG', `Internal network request authorized`, {
            requestId: req.requestId || 'pre-id',
            ip: clientIp
        });
    } else if (apiKey && !AUTHORIZED_API_KEYS.includes(apiKey)) {
        log('WARN', `Invalid API key provided`, {
            requestId: req.requestId || 'pre-id'
        });
    }

    next();
});

// Logging and security middleware
app.use((req, res, next) => {
    const start = Date.now();

    // Generate a unique request ID with cryptographically secure randomness
    const requestId = crypto.randomBytes(8).toString('hex');
    req.requestId = requestId;

    // Log request details
    const requestData = {
        requestId,
        method: req.method,
        url: req.originalUrl,
        ip: req.ip || req.headers['x-real-ip'] || req.connection.remoteAddress,
        userAgent: req.headers['user-agent']
    };

    // For DEBUG level, include request body but sanitize sensitive data
    if (DEBUG && req.method !== 'GET' && req.body) {
        requestData.body = JSON.parse(JSON.stringify(req.body)); // Clone to avoid modifying original
    }

    log('INFO', `Request received: ${req.method} ${req.originalUrl}`, requestData);

    // Set security headers (additional to Caddy's)
    res.set('Content-Security-Policy', "default-src 'none'");
    res.set('Cache-Control', 'no-store');

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

        // For DEBUG level, include response body if not too large
        if (DEBUG && res.responseBody) {
            try {
                let responseBody = res.responseBody;
                if (typeof responseBody === 'string') {
                    responseBody = JSON.parse(responseBody);
                }

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

// Helper function to validate address format - combining both versions' checks
function isValidAddress(address) {
    // Immediate disqualifiers first (most efficient)
    if (!address || typeof address !== 'string') return false;

    // Check for invalid patterns (possibly from malicious requests)
    const hasInvalidPattern = address.includes('=') ||
    address.includes('[') ||
    address.includes(']') ||
    address.includes('{') ||
    address.includes('}') ||
    address.includes('<') ||
    address.includes('>') ||
    address.includes('..') ||  // Path traversal attempt
    /\s/.test(address);       // No whitespace allowed

    if (hasInvalidPattern) return false;

    // Check if the address starts with any of the expected prefixes
    const validPrefixes = ['0x', 'sei1', 'ibc/', 'factory/'];
    return validPrefixes.some(prefix => address.startsWith(prefix));
}

// Standardized error messages
const INVALID_ADDRESS_ERROR = {
    error: 'Invalid address format',
    details: 'Address must start with 0x, sei1, ibc/, or factory/ and contain no special characters.'
};

const API_ERROR = {
    error: 'API error occurred while processing the request',
    details: 'Please try again or report the issue to: https://github.com/cordt-sei/pointer-api/issues'
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
            return res.status(400).json({ error: 'Address parameter is required' });
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

        // Check cache first - use normalized address as key
        const cacheKey = `addr:${address.toLowerCase()}`;
        if (cache.has(cacheKey)) {
            const cachedResult = cache.get(cacheKey);
            log('DEBUG', `Cache hit for address`, {
                requestId: req.requestId,
                address,
                cacheKey
            });

            // Generate ETag from cached result
            const etag = `"${crypto.createHash('md5').update(JSON.stringify(cachedResult)).digest('hex')}"`;
            res.set('ETag', etag);

            // If client has matching ETag, return 304 Not Modified
            if (req.headers['if-none-match'] === etag) {
                log('DEBUG', `ETag match - returning 304`, {
                    requestId: req.requestId,
                    address
                });
                return res.status(304).end();
            }

            return res.json(cachedResult);
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
            result: DEBUG ? result : undefined
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

        // Generate ETag for the result
        const resultString = JSON.stringify(result);
        const etag = `"${crypto.createHash('md5').update(resultString).digest('hex')}"`;
        res.set('ETag', etag);

        // Cache the successful result
        cache.set(cacheKey, result);

        res.json(result);
    } catch (error) {
        log('ERROR', 'Error processing GET request', {
            requestId: req.requestId,
            address: req.params.address,
            error: error.message,
            stack: error.stack
        });

        // Generic error handler
        res.status(500).json({
            ...API_ERROR,
            message: DEBUG ? error.message : 'An internal server error occurred'
        });
    }
});

// Route to handle POST requests for multiple addresses
app.post('/batch', async (req, res) => {
    try {
        const { addresses } = req.body;

        // Validate input
        if (!Array.isArray(addresses)) {
            log('WARN', `Invalid POST request - missing or invalid addresses array`, {
                requestId: req.requestId,
                body: DEBUG ? req.body : undefined
            });

            return res.status(400).json({
                error: 'Request must include an array called "addresses"',
                details: 'Example valid request: { "addresses": ["address1", "address2"] }'
            });
        }

        // Limit batch size for security (unless authorized)
        const REGULAR_MAX_BATCH_SIZE = 25; // Limit for unauthenticated requests

        if (!req.isAuthorized && addresses.length > REGULAR_MAX_BATCH_SIZE) {
            log('WARN', `Batch size exceeded limit for unauthorized request`, {
                requestId: req.requestId,
                receivedSize: addresses.length,
                maxSize: REGULAR_MAX_BATCH_SIZE
            });

            return res.status(400).json({
                error: `Batch size exceeds limit of ${REGULAR_MAX_BATCH_SIZE} addresses for unauthorized requests`,
                details: `Please split your request into smaller batches or use an authorized API key`
            });
        }

        // Authorized users have no batch limit
        if (req.isAuthorized && addresses.length > REGULAR_MAX_BATCH_SIZE) {
            log('INFO', `Large batch processed with authorization`, {
                requestId: req.requestId,
                batchSize: addresses.length
            });
        }

        log('DEBUG', `Processing POST request for addresses`, {
            requestId: req.requestId,
            addressCount: addresses.length
        });

        // Validate addresses
        if (addresses.length === 0) {
            log('WARN', `Empty address list in POST request`, {
                requestId: req.requestId
            });

            return res.status(400).json({ error: 'No addresses provided' });
        }

        // Separate valid and invalid addresses
        const validAddresses = [];
        const invalidAddresses = [];

        for (const addr of addresses) {
            if (isValidAddress(addr)) {
                validAddresses.push(addr);
            } else {
                invalidAddresses.push(addr);
            }
        }

        if (invalidAddresses.length > 0) {
            log('WARN', `Invalid addresses found in POST request`, {
                requestId: req.requestId,
                invalidCount: invalidAddresses.length,
                invalidAddresses: invalidAddresses.length <= 10 ? invalidAddresses : `${invalidAddresses.length} addresses (too many to show)`
            });

            // If ALL addresses are invalid, return an error
            if (validAddresses.length === 0) {
                return res.status(400).json({
                    error: 'All addresses have invalid format',
                    invalidAddresses: invalidAddresses.length <= 10 ? invalidAddresses : `${invalidAddresses.length} invalid addresses`
                });
            }

            // Otherwise, continue with the valid addresses
            log('INFO', `Continuing with ${validAddresses.length} valid addresses`, {
                requestId: req.requestId
            });
        }

        // Process valid addresses
        log('INFO', `Processing batch of ${validAddresses.length} addresses`, {
            requestId: req.requestId
        });

        // Create result objects for invalid addresses
        const invalidResults = invalidAddresses.map(addr => ({
            address: addr,
            error: 'Invalid address format',
            isBaseAsset: null,
            isPointer: null,
            pointerType: 'UNKNOWN',
            pointerAddress: null,
            pointeeAddress: null
        }));

        // Process valid addresses in parallel with error handling for each
        const validResults = await Promise.all(
            validAddresses.map(async (addr) => {
                // First check cache
                const cacheKey = `addr:${addr.toLowerCase()}`;
                if (cache.has(cacheKey)) {
                    return cache.get(cacheKey);
                }

                try {
                    log('DEBUG', `Processing address in batch`, {
                        requestId: req.requestId,
                        address: addr
                    });

                    const result = await determineAssetProperties(addr);

                    // Cache successful results
                    if (!result.error) {
                        cache.set(cacheKey, result);
                    }

                    return result;
                } catch (addrError) {
                    log('ERROR', `Error processing individual address in batch`, {
                        requestId: req.requestId,
                        address: addr,
                        error: addrError.message,
                        stack: addrError.stack
                    });

                    return {
                        address: addr,
                        error: 'Failed to process address',
                        isBaseAsset: null,
                        isPointer: null,
                        pointerType: null,
                        pointerAddress: null,
                        pointeeAddress: null
                    };
                }
            })
        );

        // Combine results from both valid and invalid addresses
        const results = [...validResults, ...invalidResults];

        log('DEBUG', `Processed POST request results`, {
            requestId: req.requestId,
            addressCount: addresses.length,
            validCount: validAddresses.length,
            invalidCount: invalidAddresses.length,
            successCount: validResults.filter(r => !r.error).length,
            errorCount: validResults.filter(r => r.error).length + invalidResults.length
        });

        res.json(results);
    } catch (error) {
        log('ERROR', 'Error processing POST request', {
            requestId: req.requestId,
            error: error.message,
            stack: error.stack
        });

        // Generic error handler
        res.status(500).json({
            ...API_ERROR,
            message: DEBUG ? error.message : 'An internal server error occurred'
        });
    }
});

// Add a specific catch-all route for invalid paths
app.use((req, res) => {
    log('WARN', `Invalid request path`, {
        requestId: req.requestId,
        method: req.method,
        path: req.path
    });

    res.status(404).json({ error: 'Endpoint not found' });
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
