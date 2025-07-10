# Sei Pointer API

This API resolves pointer relationships between assets on Sei Network. It accepts any address or denomination and returns whether it's a base asset or pointer, along with related addresses.

## Quick Start

```bash
# Check if an address is a pointer or base asset
curl https://pointer.basementnodes.ca/0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1

# Response shows this EVM address points to an IBC token
{
  "address": "0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1",
  "isBaseAsset": false,
  "isPointer": true,
  "pointerType": "NATIVE",
  "pointerAddress": "",
  "pointeeAddress": "ibc/CA6FBFAF399474A06263E10D0CE5AEBBE15189D6D4B2DD9ADE61007E68EB9DB0"
}
```

## Features

- Identifies asset types (EVM, CosmWasm, Native)
- Determines if an address is a base asset or pointer
- Returns associated pointer or pointee addresses
- Batch processing for multiple addresses
- Response caching
- API key authentication
- Structured JSON logging

## Requirements

- Node.js 18 or higher
- npm or yarn

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/cordt-sei/pointer-api.git
   cd pointer-api
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file:
   ```env
   SEIREST=https://rest.sei-apis.com
   PORT=3003
   LOG_LEVEL=INFO
   LOG_FILE=/var/log/pointer-api.log
   AUTHORIZED_API_KEYS=key1,key2,key3
   INTERNAL_IP_PREFIXES=10.,192.168.,172.16.,172.17.,127.
   CACHE_MAX_SIZE=500
   CACHE_TTL_MS=300000
   ```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `SEIREST` | Sei REST API endpoint | https://rest.sei-apis.com |
| `PORT` | Server port | 3003 |
| `LOG_LEVEL` | Log verbosity (DEBUG, INFO, WARN, ERROR) | INFO |
| `LOG_FILE` | Log file path | /var/log/pointer-api.log |
| `AUTHORIZED_API_KEYS` | Comma-separated API keys | none |
| `INTERNAL_IP_PREFIXES` | Comma-separated internal IP prefixes | 10.,192.168.,172.16.,172.17.,127. |
| `CACHE_MAX_SIZE` | Maximum cache entries | 500 |
| `CACHE_TTL_MS` | Cache time-to-live in milliseconds | 300000 |

### API Keys

Generate secure API keys:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

API keys provide:
- Unlimited batch size (default limit: 25 addresses)
- Detailed health endpoint metrics

Internal network requests don't require API keys.

## Running the API

```bash
# Production
node server.js

# Development
npm run dev
```

## Terminology

- **Base Asset**: Original token on its native protocol
- **Pointer**: Token representing another asset on a different protocol
- **Pointee**: The asset a pointer represents

## Valid Address Formats

| Type | Format | Example |
|------|--------|---------|
| EVM | `0x` + 40 hex characters | `0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1` |
| CosmWasm | `sei1` + alphanumeric | `sei1msjly0e2v5u99z53vqre47ltv0fsfa6h9fzrljuvp0e5zg76x7fswxcxjl` |
| IBC | `ibc/` + uppercase hex hash | `ibc/CA6FBFAF399474A06263E10D0CE5AEBBE15189D6D4B2DD9ADE61007E68EB9DB0` |
| TokenFactory | `factory/{creator}/{subdenom}` | `factory/sei1e3gttzq5e5k49f9f5gzvrl0rltlav65xu6p9xc0aj7e84lantdjqp7cncc/isei` |

## API Endpoints

### GET /:address

Returns pointer information for a single address.

**Request:**
```bash
curl https://pointer.basementnodes.ca/0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1
```

**Response:**
```json
{
  "address": "0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1",
  "isBaseAsset": false,
  "isPointer": true,
  "pointerType": "NATIVE",
  "pointerAddress": "",
  "pointeeAddress": "ibc/CA6FBFAF399474A06263E10D0CE5AEBBE15189D6D4B2DD9ADE61007E68EB9DB0"
}
```

**URL Encoding:**
- IBC: `/ibc/HASH` or `/ibc%2FHASH`
- Factory: `/factory/creator/subdenom` or `/factory%2Fcreator%2Fsubdenom`

### POST /

Processes single or multiple addresses.

**Single Address Request:**
```bash
curl -X POST https://pointer.basementnodes.ca/ \
  -H "Content-Type: application/json" \
  -d '{"address": "0xd78BE621436e69C81E4d0e9f29bE14C5EC51E6Ae"}'
```

**Batch Request:**
```bash
curl -X POST https://pointer.basementnodes.ca/ \
  -H "Content-Type: application/json" \
  -d '{"addresses": ["0xd78BE621436e69C81E4d0e9f29bE14C5EC51E6Ae", "sei1msjly0e2v5u99z53vqre47ltv0fsfa6h9fzrljuvp0e5zg76x7fswxcxjl"]}'
```

**With API Key:**
```bash
curl -X POST https://pointer.basementnodes.ca/ \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-key-here" \
  -d '{"addresses": ["address1", "address2"]}'
```

Returns single object for single address, array for multiple addresses.

### GET /health

Returns API health status.

**Request:**
```bash
curl https://pointer.basementnodes.ca/health
```

**Basic Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-07-10T15:23:45.678Z",
  "uptime": 86400.123,
  "cacheStats": {
    "size": 123,
    "maxSize": 500
  }
}
```

Authorized users receive additional metrics: memory usage, cache hit rates, and version information.

## Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `address` | string | The queried address |
| `isBaseAsset` | boolean | True if address is a base asset |
| `isPointer` | boolean | True if address is a pointer |
| `pointerType` | string | Type of pointer (ERC20, ERC721, ERC1155, CW20, CW721, CW1155, NATIVE) |
| `pointerAddress` | string | Associated pointer address (empty if isPointer is true) |
| `pointeeAddress` | string | Associated pointee address (empty if isBaseAsset is true) |

## Error Responses

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 304 | Not Modified (ETag match) |
| 400 | Invalid address format |
| 403 | Invalid or missing API key |
| 404 | Endpoint not found |
| 429 | Rate limit exceeded |
| 500 | Server error |

**Error Format:**
```json
{
  "error": "Invalid address format",
  "details": "Valid formats: EVM hex (0x + 40 hex chars), Bech32 CosmWasm (sei1...), IBC denom (ibc/HASH), TokenFactory (factory/creator/subdenom)"
}
```

## Deployment

### Systemd Service

Create `/etc/systemd/system/pointer-api.service`:

```ini
[Unit]
Description=Sei Pointer API
After=network.target

[Service]
Type=simple
WorkingDirectory=/path/to/pointer-api
ExecStart=/usr/bin/node /path/to/pointer-api/server.js
Restart=always
User=nodejs
Environment=NODE_ENV=production
EnvironmentFile=/path/to/pointer-api/.env

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
systemctl enable pointer-api
systemctl start pointer-api
```

### Reverse Proxy

The API works with any reverse proxy. Example Caddy configuration:

```caddyfile
pointer.example.com {
    reverse_proxy localhost:3003
    encode gzip
}
```

## Logging

The API outputs structured JSON logs. Each log entry includes:
- timestamp
- level (DEBUG, INFO, WARN, ERROR)
- message
- data (contextual information)

Use `jq` to parse logs:
```bash
tail -f /var/log/pointer-api.log | jq
```

## Support

Report issues: https://github.com/cordt-sei/pointer-api/issues

## License

MIT License
