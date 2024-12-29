# Sei Asset<>Pointer Metadata

Provides a simplified, unified API for checking pointer and pointee relationships of addresses on the Sei Network. This API accepts any valid asset denom or contract address as input and returns all relevant details without requiring users to specify whether the address is a "pointer" or "pointee" or the type.

## Purpose

This API simplifies the following processes:

- **Identify Address Types**: Determines whether a given address is an EVM (Ethereum Virtual Machine), CW (CosmWasm), or NATIVE token type.
- **Check Address Properties**: Identifies whether the address is a base asset or a pointer to another address.
- **Retrieve Associated Addresses**: Finds and returns associated pointer or pointee addresses if they exist.
- **Support Multiple Inputs**: Accepts a single address, multiple addresses, or a JSON file for batch processing.

## Features

1. **Flexible Input**: Accepts both single and multiple addresses in a request.
2. **Concurrent Processing**: Uses concurrent API calls to improve performance when handling multiple addresses.
3. **Detailed Results**: Provides comprehensive information about each address, including its type, whether it is a base asset or a pointer, and any associated addresses.

## Usage

1. **Input an Address or List of Addresses**: Provide one or more addresses to the API.
2. **Determine Address Type**: The API automatically determines whether each address is an EVM, CW, or NATIVE type.
3. **Run Relevant Queries**: Based on the determined type, the API runs appropriate concurrent queries to retrieve address properties.
4. **Return Results**: The API returns a JSON response with the following details:
   - `isBaseAsset` (boolean): Indicates if the address is a base asset.
   - `isPointer` (boolean): Indicates if the address is a pointer to another address.
   - `pointerAddress` (string): The address acting as a pointer (if applicable).
   - `pointeeAddress` (string): The original address being pointed to (if applicable).

## API Endpoints

### `POST /`

#### Description

Checks one or more provided addresses and returns their properties in a JSON format.

#### Request Format

The request body can be either:
- A single address:
  ```json
  { "address": "0x809FF4801aA5bDb33045d1fEC810D082490D63a4" }
  ```
- An array of addresses:
  ```json
  { "addresses": ["sei1eavtmc4y00a0ed8l9c7l0m7leesv3yetcptklv2kalz4tsgz02mqlvyea6", "ibc/CA6FBFAF399474A06263E10D0CE5AEBBE15189D6D4B2DD9ADE61007E68EB9DB0"] }
  ```

#### Example Requests

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
   -d '{"addresses": ["0xd78BE621436e69C81E4d0e9f29bE14C5EC51E6Ae", "sei1msjly0e2v5u99z53vqre47ltv0fsfa6h9fzrljuvp0e5zg76x7fswxcxjl",   "ibc/CA6FBFAF399474A06263E10D0CE5AEBBE15189D6D4B2DD9ADE61007E68EB9DB0", "sei1hrndqntlvtmx2kepr0zsfgr7nzjptcc72cr4ppk4yav58vvy7v3s4er8ed", "0x5f0E07dFeE5832Faa00c63F2D33A0D79150E8598", "ibc/ED07A3391A112B175915CD8FAF43A2DA8E4790EDE12566649D0C2F97716B8518", "factory/sei1e3gttzq5e5k49f9f5gzvrl0rltlav65xu6p9xc0aj7e84lantdjqp7cncc/isei"]}'
  ```

#### Example Response

- **For a Single Address**:
  ```json
  {
    "address": "0x809FF4801aA5bDb33045d1fEC810D082490D63a4",
    "isBaseAsset": true,
    "isPointer": false,
    "pointerAddress": "",
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
       "pointerAddress": "0xBdE3bD155613752065C52059f8B2F72f506C4374",
       "pointeeAddress": ""
     },
     {
       "address": "factory/sei1e3gttzq5e5k49f9f5gzvrl0rltlav65xu6p9xc0aj7e84lantdjqp7cncc/isei",
       "isBaseAsset": true,
       "isPointer": false,
       "pointerAddress": "0x5Cf6826140C1C56Ff49C808A1A75407Cd1DF9423",
       "pointeeAddress": ""
     }
   ]
  ```

## Contributions

Contributions are welcome! Feel free to open issues or submit pull requests to enhance the functionality or usability of this project.
