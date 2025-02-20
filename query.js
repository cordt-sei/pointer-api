const axios = require('axios');

const SEIREST = 'http://localhost:1317';

// Function to determine the type of address
function determineAddressType(address) {
    if (address.startsWith('0x') && address.length === 42) {
        return 'EVM';
    } else if (address.startsWith('sei1')) {
        return 'CW';
    } else if (address.startsWith('ibc/') || address.startsWith('factory/')) {
        return 'NATIVE';
    } else {
        return 'UNKNOWN';
    }
}

// Function to perform REST API calls
async function queryAPI(endpoint, params) {
    try {
        const response = await axios.get(`${SEIREST}${endpoint}`, { params });
        return response.data;
    } catch (error) {
        console.error('Error querying API:', error.message);
        return null;
    }
}

// Main function to determine asset properties
async function determineAssetProperties(address) {
    const addressType = determineAddressType(address);
    let isBaseAsset = false;
    let isPointer = false;
    let pointerAddress = '';
    let pointeeAddress = '';

    if (addressType === 'EVM') {
        const encodedAddress = encodeURIComponent(address);
        const erc20Result = await queryAPI('/sei-protocol/seichain/evm/pointee', {
            pointerType: 0,
            pointer: encodedAddress
        });
        const erc721Result = await queryAPI('/sei-protocol/seichain/evm/pointee', {
            pointerType: 1,
            pointer: encodedAddress
        });

        if (erc20Result && erc20Result.exists) {
            isPointer = true;
            pointeeAddress = erc20Result.pointee;
        } else if (erc721Result && erc721Result.exists) {
            isPointer = true;
            pointeeAddress = erc721Result.pointee;
        }

    } else if (addressType === 'CW') {
        const encodedAddress = encodeURIComponent(address);
        const cw20Result = await queryAPI('/sei-protocol/seichain/evm/pointee', {
            pointerType: 3,
            pointer: encodedAddress
        });
        const cw721Result = await queryAPI('/sei-protocol/seichain/evm/pointee', {
            pointerType: 4,
            pointer: encodedAddress
        });

        if (cw20Result && cw20Result.exists) {
            isPointer = true;
            pointeeAddress = cw20Result.pointee;
        } else if (cw721Result && cw721Result.exists) {
            isPointer = true;
            pointeeAddress = cw721Result.pointee;
        }

    } else if (addressType === 'NATIVE') {
        const encodedAddress = encodeURIComponent(address);
        const nativeResult = await queryAPI('/sei-protocol/seichain/evm/pointer', {
            pointerType: 2,
            pointee: encodedAddress
        });

        if (nativeResult && nativeResult.exists) {
            isPointer = true;
            pointerAddress = nativeResult.pointer;
        }
    }

    // Define as base asset (if no pointer is found)
    isBaseAsset = !isPointer;

    // Return the result object
    return {
        address,
        isBaseAsset,
        isPointer,
        pointerAddress,
        pointeeAddress
    };
}
