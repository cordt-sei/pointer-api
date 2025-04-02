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
  API_KEY=your_api_key_here
  PORT=3003
  LOG_LEVEL=INFO  # Options: DEBUG, INFO, WARN, ERROR
  LOG_FILE=/var/log/pointer-api.log
  ```

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

### POST `/`

Checks multiple addresses. The request body can contain a single address or an array of addresses.

**Examples:**

```bash
# Single address
curl -X POST https://pointer.basementnodes.ca/ \
-H "Content-Type: application/json" \
-d '{"address": "0x809FF4801aA5bDb33045d1fEC810D082490D63a4"}'

# Multiple addresses
curl -X POST https://pointer.basementnodes.ca/ \
-H "Content-Type: application/json" \
-d '{"addresses": ["0xd78BE621436e69C81E4d0e9f29bE14C5EC51E6Ae", "sei1msjly0e2v5u99z53vqre47ltv0fsfa6h9fzrljuvp0e5zg76x7fswxcxjl"]}'
```

Response for multiple addresses is an array of results.

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
Environment=API_KEY=your_api_key_here
Environment=LOG_LEVEL=INFO
Environment=LOG_FILE=/var/log/pointer-api.log

[Install]
WantedBy=multi-user.target
```

### Caddy Configuration

```caddyfile
web-app.your.domain {
    log {
        output file /var/log/pointerapi.log
        format json
        level info
    }

    # Handle special characters in URLs
    @ibcInvalidURL path_regexp ibcPath ^/ibc/([^/]+)$
    rewrite @ibcInvalidURL /ibc%2F{re.ibcPath.1}

    @factoryInvalidURL path_regexp factoryPath ^/factory/([^/]+)/([^/]+)$
    rewrite @factoryInvalidURL /factory%2F{re.factoryPath.1}%2F{re.factoryPath.2}

    # Proxy to API
    reverse_proxy 127.0.0.1:3003 {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
    }

    # Security headers
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        X-XSS-Protection "1; mode=block"
        Referrer-Policy "no-referrer-when-downgrade"
        Permissions-Policy "geolocation=(), camera=(), microphone=(), interest-cohort=()"
    }

    encode gzip
}
```

## Troubleshooting

For persistent issues, please open an issue at: <https://github.com/cordt-sei/pointer-api/issues>

## License

MIT License
