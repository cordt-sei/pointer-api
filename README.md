# Sei Asset<>Pointer Metadata

A unified API for checking pointer and pointee relationships of addresses on the Sei Network. Accepts any valid asset denom or contract address as input and returns relevant details without requiring users to specify address type.

## Features
- Identifies asset types (EVM, CW, NATIVE)
- Checks whether an address / denom is a base asset or pointer
- Retrieves associated pointer or pointee addresses
- Supports multiple inputs for batch processing
- Concurrent processing for large batches

## Requirements
- Node.js v18+
- Yarn or npm
- Dependencies: axios, express, dotenv

## Installation
1. Clone the repository:
```bash
git clone https://github.com/yourusername/sei-address-checker.git
cd sei-address-checker
```

2. Install dependencies:
```bash
yarn install
```

3. Configure environment in `.env`:
```env
SEIREST=https://rest.sei-apis.com
API_KEY=your_api_key_here
PORT=3003
```

## Running the API
```bash
node server.js
```

## API Endpoints

### GET `/:address`
Checks a single address and returns its properties. Handles URL encoding for addresses with special characters.

Example requests:
```bash
# Simple address
curl -X GET https://pointer.basementnodes.ca/0x809FF4801aA5bDb33045d1fEC810D082490D63a4

# IBC address 
curl -X GET https://pointer.basementnodes.ca/ibc%2FCA6FBFAF399474A06263E10D0CE5AEBBE15189D6D4B2DD9ADE61007E68EB9DB0

# Factory address
curl -X GET https://pointer.basementnodes.ca/factory%2Fsei1e3gttzq5e5k49f9f5gzvrl0rltlav65xu6p9xc0aj7e84lantdjqp7cncc%2Fisei
```

Response:
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
Checks multiple addresses. Request body can contain a single address or array of addresses.

Examples:
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
- `400 Bad Request`: Invalid input format
- `403 Forbidden`: API key invalid/missing
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server-side issue

## Testing
Run API tests:
```bash
yarn test
```

Verify API key configuration:
```bash
yarn test:api-key
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
For persistent issues, please open an issue at: https://github.com/cordt-sei/pointer-api/issues

## License
MIT License
