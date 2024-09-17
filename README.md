# Sei Network Address Checker

Provides a simplified, unified API for all pointer+pointee checks, rather than specifying "pointer" or "pointee" and which type of pointer, it accepts any valid asset denom or contract address as a string and outputs all relevant details.

## Purpose

The following processes are handled or simplified:

- **Identify Address Types**: Determine if a given address is an EVM (Ethereum Virtual Machine), CW (CosmWasm), or NATIVE token type.
- **Check Address Properties**: Assess whether the address is a base asset or a pointer to another address.
- **Retrieve Associated Addresses**: Find and return the associated pointer or pointee addresses if they exist.
- **Support Multiple Inputs**: Accepts a single address, multiple addresses, or a JSON file for batch processing.

## Usage

1. **Input an Address or List of Addresses**: Provide one or more addresses to the API or through the web app.
2. **Determine Address Type**: The application determines whether each address is an EVM, CW, or NATIVE type.
3. **Run Relevant Queries**: Based on the type, the API runs the appropriate queries to retrieve address properties.
4. **Return Results**: The API returns a JSON response with details such as:
   - `isBaseAsset` (boolean): Indicates if the address is a base asset.
   - `isPointer` (boolean): Indicates if the address is a pointer to another address.
   - `pointerAddress` (string): The address acting as a pointer (if applicable).
   - `pointeeAddress` (string): The original address being pointed to (if applicable).

## API Endpoints

### `POST /check-address`

#### Description

Checks one or more provided addresses and returns their properties.

#### Request Format

The request body can be either:
- A single address:
  ```json
  { "address": "0x809FF4801aA5bDb33045d1fEC810D082490D63a4" }
  ```
- An array of addresses:
  ```json
  { "assets": ["sei1eavtmc4y00a0ed8l9c7l0m7leesv3yetcptklv2kalz4tsgz02mqlvyea6", "ibc/CA6FBFAF399474A06263E10D0CE5AEBBE15189D6D4B2DD9ADE61007E68EB9DB0"] }
  ```

#### Example Request

```bash
curl -X POST http://localhost:3000/check-address \
  -H "Content-Type: application/json" \
  -d '{"address": "0x809FF4801aA5bDb33045d1fEC810D082490D63a4"}'
```

#### Example Response

For a single address:
```json
{
  "address": "0x809FF4801aA5bDb33045d1fEC810D082490D63a4",
  "isBaseAsset": true,
  "isPointer": false,
  "pointerAddress": "",
  "pointeeAddress": ""
}
```

For multiple addresses:
```json
[
  {
    "address": "0x809FF4801aA5bDb33045d1fEC810D082490D63a4",
    "isBaseAsset": true,
    "isPointer": false,
    "pointerAddress": "",
    "pointeeAddress": ""
  },
  {
    "address": "sei1eavtmc4y00a0ed8l9c7l0m7leesv3yetcptklv2kalz4tsgz02mqlvyea6",
    "isBaseAsset": true,
    "isPointer": false,
    "pointerAddress": "",
    "pointeeAddress": ""
  }
]
```

## Using the Web App

The web app provides a simple interface where users can:

- **Enter a Single Address or Multiple Addresses**: Use the input field to enter one or more addresses separated by commas.
- **Upload a JSON File**: Choose a JSON file containing an array of addresses to check multiple addresses at once.

### How to Use

1. **Enter Addresses**: Type in one or more addresses separated by commas in the input field.
2. **Upload a JSON File**: Click on the file input button to upload a JSON file containing an array of addresses (e.g., `{"assets":["sei1...", "ibc/..."]}`).
3. **Submit**: Click the "Check Address" button to submit the addresses for checking.
4. **View Results**: The results will display below the form, showing the properties of each address.

## Example Use Cases

- **Developers**: Integrate the API into blockchain tools, explorers, or dApps to provide seamless address checks.
- **End Users**: Use the web app to verify addresses and understand their properties for security or trading purposes.
- **Batch Processing**: Upload a JSON file to quickly check multiple addresses in one go.

## Contributions

Contributions are welcome! Feel free to open issues or submit pull requests to enhance the functionality or usability of this project.
