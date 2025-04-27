# Sei Asset-Pointer API

A unified API for checking pointer and pointee relationships of addresses on the Sei Network. Accepts any valid asset denom or contract address as input and returns relevant details without requiring users to specify address type.

## Features

- Identifies asset types (EVM, CW, NATIVE)
- Checks whether an address/denom is a base asset or pointer
- Retrieves associated pointer or pointee addresses
- Supports multiple inputs for batch processing
- Concurrent processing for large batches
- Comprehensive structured logging
- Robust error handling
- HTTP caching
- In-memory LRU caching
- API key support [bypasses max batch size, more detailed /health endpoint]

## Requirements

- Node.js v18+
- Yarn or npm
- Dependencies: axios, express, dotenv

## Installation

- Clone the repository:

  ```bash
  git clone https://github.com/yourusername/sei-address-checker.git
  cd sei-address-checker
  ```

- Install dependencies:

  ```bash
  yarn install
  ```

- Configure environment in `.env`:

  ```env
  SEIREST=https://rest.sei-apis.com
  PORT=3003
  LOG_LEVEL=INFO  # Options: DEBUG, INFO, WARN, ERROR
  LOG_FILE=/var/log/pointer-api.log
  AUTHORIZED_API_KEYS=key1,key2,key3  # Comma-separated list of valid API keys
  API_KEY_HEADER=X-API-Key  # Optional: custom header label
  CACHE_MAX_SIZE=500        # Max entries in cache
  CACHE_TTL_MS=300000       # Cache TTL in ms (5 min default)

  ```

## API Key Management

### Generating Secure API Keys

API keys should be cryptographically secure random strings. Here are methods to generate them:

```bash
# Using Node.js (recommended)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Using OpenSSL
openssl rand -hex 32

# Using bash
cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1
```

### Configuring API Keys

1. Generate one or more API keys using the methods above
2. Add them to your environment configuration:
   
   ```env
   # In .env file
   AUTHORIZED_API_KEYS=8a7b6c5d4e3f2g1h,9i8j7k6l5m4n3o2p
   ```

   Or when starting the server:
   ```bash
   AUTHORIZED_API_KEYS=8a7b6c5d4e3f2g1h,9i8j7k6l5m4n3o2p node server.js
   ```

   Or in your systemd service file:
   ```ini
   Environment="AUTHORIZED_API_KEYS=8a7b6c5d4e3f2g1h,9i8j7k6l5m4n3o2p"
   ```

### API Key Benefits

Users with valid API keys enjoy elevated privileges:
- **Unlimited batch sizes**: Authorized users can submit requests with any number of addresses (non-authorized users are limited to 25 addresses per request)
- **Enhanced health metrics**: Authorized users receive detailed information in the `/health` endpoint, including memory usage, cache hit rates, and version information

Requests from internal network IPs are automatically authorized without requiring an API key.

### Using API Keys (Client Documentation)

To authenticate your requests:

```bash
# Include the X-API-Key header in your requests
curl -X POST https://pointer.basementnodes.ca/batch \
-H "Content-Type: application/json" \
-H "X-API-Key: your-api-key-here" \
-d '{"addresses": ["0xd78BE621436e69C81E4d0e9f29bE14C5EC51E6Ae", "sei1msjly0e2v5u99z53vqre47ltv0fsfa6h9fzrljuvp0e5zg76x7fswxcxjl"]}'
```

For programmatic clients:

```javascript
// JavaScript example
fetch('https://pointer.basementnodes.ca/batch', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': 'your-api-key-here'
  },
  body: JSON.stringify({
    addresses: ['0xd78BE621436e69C81E4d0e9f29bE14C5EC51E6Ae']
  })
})
```

```python
# Python example
import requests
headers = {
    'Content-Type': 'application/json',
    'X-API-Key': 'your-api-key-here'
}
data = {
    'addresses': ['0xd78BE621436e69C81E4d0e9f29bE14C5EC51E6Ae']
}
response = requests.post('https://pointer.basementnodes.ca/batch', headers=headers, json=data)
```

### Security Recommendations

When implementing API keys:

- Store keys securely and never commit them to version control
- Rotate keys periodically (e.g., every 90 days)
- Revoke keys that may have been compromised
- Use a different key for each client or service
- Log and monitor API key usage for suspicious patterns

## Running the API

```bash
# Normal mode
node server.js

# Development mode with debug logging
yarn dev  # or: LOG_LEVEL=DEBUG node server.js
```

## Terminology

- **Base Asset**: The original asset/token on its native chain or protocol
- **Pointer**: A token that represents another asset (the pointee) on a different layer or protocol
- **Pointee**: The base asset that has a corresponding pointer token

## Asset Types

The API handles three distinct asset types:

1. **EVM Assets**: Ethereum-style addresses starting with "0x"
   - Can be base assets with CW pointers
   - Can be pointers to CW or NATIVE assets

2. **CW Assets**: CosmWasm addresses starting with "sei1"
   - Can be base assets with EVM pointers
   - Can be pointers to EVM assets

3. **NATIVE Assets**: Native Sei denoms starting with "ibc/" or "factory/"
   - Always base assets
   - Can have EVM pointers

## API Endpoints

### GET `/:address`

Checks a single address and returns its properties. Handles URL encoding for addresses with special characters.

**Example requests:**

```bash
# Simple address
curl -X GET https://pointer.basementnodes.ca/0x809FF4801aA5bDb33045d1fEC810D082490D63a4

# IBC address 
curl -X GET https://pointer.basementnodes.ca/ibc%2FCA6FBFAF399474A06263E10D0CE5AEBBE15189D6D4B2DD9ADE61007E68EB9DB0

# Factory address
curl -X GET https://pointer.basementnodes.ca/factory%2Fsei1e3gttzq5e5k49f9f5gzvrl0rltlav65xu6p9xc0aj7e84lantdjqp7cncc%2Fisei
```

**Note:** The GET endpoint can be accessed directly via a web browser. Enter a valid URL in the browser's address bar, the API will handle URL-encoded characters and return the expected JSON response.

**Response:**

```json
{
  "address": "0x809FF4801aA5bDb33045d1fEC810D082490D63a4",
  "isBaseAsset": true,
  "isPointer": false,
  "pointerType": "ERC20",
  "pointerAddress": "sei1msjly0e2v5u99z53vqre47ltv0fsfa6h9fzrljuvp0e5zg76x7fswxcxjl",
  "pointeeAddress": ""
}
```

### POST `/batch`

Checks multiple addresses in a single request. The request body should contain an array of addresses.

**Examples:**

```bash
# Multiple addresses
curl -X POST https://pointer.basementnodes.ca/batch \
-H "Content-Type: application/json" \
-d '{"addresses": ["0xd78BE621436e69C81E4d0e9f29bE14C5EC51E6Ae", "sei1msjly0e2v5u99z53vqre47ltv0fsfa6h9fzrljuvp0e5zg76x7fswxcxjl"]}'

# With API key for unlimited batch size
curl -X POST https://pointer.basementnodes.ca/batch \
-H "Content-Type: application/json" \
-H "X-API-Key: your-api-key-here" \
-d '{"addresses": ["0xd78BE621436e69C81E4d0e9f29bE14C5EC51E6Ae", "sei1msjly0e2v5u99z53vqre47ltv0fsfa6h9fzrljuvp0e5zg76x7fswxcxjl"]}'
```

Response for multiple addresses is an array of results.

### GET `/health`

Returns the current status and health metrics of the API.

**Example:**

```bash
curl -X GET https://pointer.basementnodes.ca/health
```

**Response for unauthorized users:**

```json
{
  "status": "ok",
  "timestamp": "2025-04-27T15:23:45.678Z",
  "uptime": 86400.123,
  "cacheStats": {
    "size": 123,
    "maxSize": 500
  }
}
```

**Additional response data for authorized users:**

```json
{
  "version": "1.2.0",
  "nodeVersion": "v18.16.0",
  "environment": "production",
  "logLevel": "INFO",
  "memoryUsage": {
    "rss": 56123456,
    "heapTotal": 34123456,
    "heapUsed": 27654321,
    "external": 1234567
  },
  "authorization": {
    "method": "api_key"  // or "internal_network"
  },
  "cacheStats": {
    "hits": 12345,
    "misses": 2345,
    "hitRate": 0.84
  }
}
```

## Error Handling

The API returns standard HTTP status codes:

- `200 OK`: Request successful
- `400 Bad Request`: Invalid input format or address
- `403 Forbidden`: API key invalid/missing
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server-side issue

Error responses include a descriptive message and often additional details to help diagnose the issue.

## Logging

The API includes a structured logging system with configurable levels:

- `DEBUG`: Provides full request/response details, including bodies
- `INFO`: Basic operational details without sensitive data
- `WARN`: Warnings and potential issues
- `ERROR`: Error conditions with stack traces

All logs are in JSON format and can be written to a file specified by the `LOG_FILE` environment variable.

## Testing

Run API tests:

```bash
yarn test
```

## Deployment

### Systemd Service

```ini
[Unit]
Description=Sei Asset Pointer Metadata API
After=network.target

[Service]
Type=simple
WorkingDirectory=/path/to/pointer-api
ExecStart=/usr/bin/node /path/to/pointer-api/server.js
Restart=on-failure
User=root
Environment=PORT=3003
Environment=SEIREST=https://rest.sei-apis.com
Environment=LOG_LEVEL=INFO
Environment=LOG_FILE=/var/log/pointer-api.log
Environment=AUTHORIZED_API_KEYS=key1,key2,key3
Environment=CACHE_MAX_SIZE=500
Environment=CACHE_TTL_MS=300000
Environment=API_KEY_HEADER=X-API-Key

[Install]
WantedBy=multi-user.target
```

### Caddy Configuration

```caddyfile
pointer.basementnodes.ca {
    # 1. Static files first
    @robots path /robots.txt
    handle @robots {
        file_server
    }
    @favicon path /favicon.ico
    handle @favicon {
        file_server
    }
    
    # 2. Catch literal "/", return 404
    @root path /
    handle @root {
        respond "Invalid endpoint" 404
    }
    
    # 3. URL-encoding rewrites
    @ibcInvalidURL path_regexp ibcPath ^/ibc/([^/]+)$
    rewrite @ibcInvalidURL /ibc%2F{re.ibcPath.1}
    
    @factoryInvalidURL path_regexp factoryPath ^/factory/([^/]+)/([^/]+)$
    rewrite @factoryInvalidURL /factory%2F{re.factoryPath.1}%2F{re.factoryPath.2}
    
    # 4. Everything else → your API
    reverse_proxy 10.70.48.203:3003 {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
    }
    
    encode gzip
    
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        X-XSS-Protection "1; mode=block"
        Referrer-Policy "no-referrer-when-downgrade"
        Permissions-Policy "geolocation=(), camera=(), microphone=(), interest-cohort=()"
    }
    
    log {
        output file /var/log/pointer-basementnodes.log
        format json
        level info
    }
}
```

## Troubleshooting

For persistent issues, please open an issue at: <https://github.com/cordt-sei/pointer-api/issues>

## License

MIT License
