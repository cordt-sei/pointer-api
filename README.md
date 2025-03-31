# Sei Asset<>Pointer Metadata

A simplified, unified API for checking pointer and pointee relationships of addresses on the Sei Network. This API accepts any valid asset denom or contract address as input and returns all relevant details without requiring users to specify whether the address is a "pointer" or "pointee" or the type.

## Features

- **Identify Address Types**: Determines whether a given address is an EVM (Ethereum Virtual Machine), CW (CosmWasm), or NATIVE token type.
- **Check Address Properties**: Identifies whether the address is a base asset or a pointer to another address.
- **Retrieve Associated Addresses**: Finds and returns associated pointer or pointee addresses if they exist.
- **Support Multiple Inputs**: Accepts a single address, multiple addresses, or a JSON file for batch processing.
- **Concurrent Processing**: Uses concurrent API calls to improve performance when handling multiple addresses.

## Requirements

- Node.js v18+
- Yarn (recommended) or npm
- Dependencies: `axios`, `express`

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

3. Configure environment variables in `.env`:
```env
SEIREST=https://rest.sei-apis.com
API_KEY=your_api_key_here
PORT=3003
```

## Running the API Server

```bash
node server.js
```

The server will start on port `3003` by default (configurable in `.env`).

## API Endpoints

### GET `/:address`

Checks a single address provided in the URL path parameter and returns its properties. The API automatically handles URL encoding for addresses containing special characters like `/` in IBC or factory addresses.

**Example Requests**:
```bash
# For a simple address
curl -X GET https://pointer.basementnodes.ca/0x809FF4801aA5bDb33045d1fEC810D082490D63a4

# For an IBC address 
curl -X GET https://pointer.basementnodes.ca/ibc%2FCA6FBFAF399474A06263E10D0CE5AEBBE15189D6D4B2DD9ADE61007E68EB9DB0

# For a factory address
curl -X GET https://pointer.basementnodes.ca/factory%2Fsei1e3gttzq5e5k49f9f5gzvrl0rltlav65xu6p9xc0aj7e84lantdjqp7cncc%2Fisei
```

Note: When using the browser, you can enter the address directly in the URL. The web server will properly handle IBC and factory addresses with `/` characters.

**Response**:
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

Checks one or more provided addresses and returns their properties in a JSON format.

**Request Format**:

The request body can be either:
- A single address:
  ```json
  { "address": "0x809FF4801aA5bDb33045d1fEC810D082490D63a4" }
  ```
- An array of addresses:
  ```json
  { "addresses": ["sei1eavtmc4y00a0ed8l9c7l0m7leesv3yetcptklv2kalz4tsgz02mqlvyea6", "ibc/CA6FBFAF399474A06263E10D0CE5AEBBE15189D6D4B2DD9ADE61007E68EB9DB0"] }
  ```

**Example Requests**:

- **Single Address Request**:
  ```bash
  curl -X POST https://pointer.basementnodes.ca/ \
  -H "Content-Type: application/json" \
  -d '{"address": "0x809FF4801aA5bDb33045d1fEC810D082490D63a4"}'
  ```

- **Multiple Addresses Request**:
  ```bash
  curl -X POST https://pointer.basementnodes.ca/ \
  -H "Content-Type: application/json" \
  -d '{"addresses": ["0xd78BE621436e69C81E4d0e9f29bE14C5EC51E6Ae", "sei1msjly0e2v5u99z53vqre47ltv0fsfa6h9fzrljuvp0e5zg76x7fswxcxjl", "ibc/CA6FBFAF399474A06263E10D0CE5AEBBE15189D6D4B2DD9ADE61007E68EB9DB0", "sei1hrndqntlvtmx2kepr0zsfgr7nzjptcc72cr4ppk4yav58vvy7v3s4er8ed", "0x5f0E07dFeE5832Faa00c63F2D33A0D79150E8598", "ibc/ED07A3391A112B175915CD8FAF43A2DA8E4790EDE12566649D0C2F97716B8518", "factory/sei1e3gttzq5e5k49f9f5gzvrl0rltlav65xu6p9xc0aj7e84lantdjqp7cncc/isei"]}'
  ```
  
  The `addresses` field is required exactly as shown - the server expects this field name to properly parse the request.

**Example Response**:

- **For a Single Address**:
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

- **For Multiple Addresses**:
  ```json
  [
    {
      "address": "0xd78BE621436e69C81E4d0e9f29bE14C5EC51E6Ae",
      "isBaseAsset": true,
      "isPointer": false,
      "pointerType": "ERC20",
      "pointerAddress": "sei1msjly0e2v5u99z53vqre47ltv0fsfa6h9fzrljuvp0e5zg76x7fswxcxjl",
      "pointeeAddress": ""
    },
    {
      "address": "sei1msjly0e2v5u99z53vqre47ltv0fsfa6h9fzrljuvp0e5zg76x7fswxcxjl",
      "isBaseAsset": false,
      "isPointer": true,
      "pointerType": "ERC20",
      "pointerAddress": "",
      "pointeeAddress": "0xd78BE621436e69C81E4d0e9f29bE14C5EC51E6Ae"
    },
    {
      "address": "ibc/CA6FBFAF399474A06263E10D0CE5AEBBE15189D6D4B2DD9ADE61007E68EB9DB0",
      "isBaseAsset": true,
      "isPointer": false,
      "pointerType": "NATIVE",
      "pointerAddress": "0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1",
      "pointeeAddress": ""
    },
    {
      "address": "sei1hrndqntlvtmx2kepr0zsfgr7nzjptcc72cr4ppk4yav58vvy7v3s4er8ed",
      "isBaseAsset": true,
      "isPointer": false,
      "pointerType": "CW20",
      "pointerAddress": "0x5f0E07dFeE5832Faa00c63F2D33A0D79150E8598",
      "pointeeAddress": ""
    },
    {
      "address": "0x5f0E07dFeE5832Faa00c63F2D33A0D79150E8598",
      "isBaseAsset": false,
      "isPointer": true,
      "pointerType": "CW20",
      "pointerAddress": "",
      "pointeeAddress": "sei1hrndqntlvtmx2kepr0zsfgr7nzjptcc72cr4ppk4yav58vvy7v3s4er8ed"
    },
    {
      "address": "ibc/ED07A3391A112B175915CD8FAF43A2DA8E4790EDE12566649D0C2F97716B8518",
      "isBaseAsset": true,
      "isPointer": false,
      "pointerType": "NATIVE",
      "pointerAddress": "0xBdE3bD155613752065C52059f8B2F72f506C4374",
      "pointeeAddress": ""
    },
    {
      "address": "factory/sei1e3gttzq5e5k49f9f5gzvrl0rltlav65xu6p9xc0aj7e84lantdjqp7cncc/isei",
      "isBaseAsset": true,
      "isPointer": false,
      "pointerType": "NATIVE",
      "pointerAddress": "0x5Cf6826140C1C56Ff49C808A1A75407Cd1DF9423",
      "pointeeAddress": ""
    }
  ]
  ```

## Error Handling

The API returns standard HTTP status codes:

- `200 OK`: Request successful
- `400 Bad Request`: Invalid input format or missing required parameters
- `403 Forbidden`: API key invalid or missing
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server-side error

Each error response includes a JSON object with an `error` property containing a descriptive message.

## Deploy as Systemd Service

Create a systemd unit file `sei-address-checker.service`:

```ini
[Unit]
Description=Sei Asset Pointer Metadata API
After=network.target

[Service]
Type=simple
WorkingDirectory=/path/to/sei-address-checker
ExecStart=/usr/bin/node /path/to/sei-address-checker/server.js
Restart=on-failure
User=root
Environment=PORT=3003
Environment=SEIREST=https://rest.sei-apis.com
Environment=API_KEY=your_api_key_here

[Install]
WantedBy=multi-user.target
```

Activate the service:

```bash
sudo cp sei-address-checker.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable sei-address-checker.service
sudo systemctl start sei-address-checker.service
```

## Caddy Reverse Proxy Configuration

Serve behind Caddy with the following configuration:

```caddyfile
pointer.basementnodes.ca {
    log {
        output file /var/log/pointer-basementnodes.log
        format json
        level info
    }

    # Match requests that have "ibc/" followed by a single segment
    @ibcInvalidURL path_regexp ibcPath ^/ibc/([^/]+)$
    rewrite @ibcInvalidURL /ibc%2F{re.ibcPath.1}

    # Match requests that have "factory/" followed by two segments
    @factoryInvalidURL path_regexp factoryPath ^/factory/([^/]+)/([^/]+)$
    rewrite @factoryInvalidURL /factory%2F{re.factoryPath.1}%2F{re.factoryPath.2}

    # Reverse proxy all requests to the backend API
    reverse_proxy 127.0.0.1:3003 {
        # Forward necessary headers
        header_up Host {host}
        header_up X-Real-IP {remote_host}
    }

    # Security headers for all responses
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        X-XSS-Protection "1; mode=block"
        Referrer-Policy "no-referrer-when-downgrade"
        Permissions-Policy "geolocation=(), camera=(), microphone=(), interest-cohort=()"
    }

    # Enable gzip compression for responses
    encode gzip
}
```

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests to enhance the functionality or usability of this project.

## License

MIT License
