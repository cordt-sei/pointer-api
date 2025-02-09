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
        // Query for ERC20 and ERC721
        const erc20Result = await queryAPI('/sei-protocol/seichain/evm/pointee', {
            pointerType: 0,
            pointer: address
        });
        const erc721Result = await queryAPI('/sei-protocol/seichain/evm/pointee', {
            pointerType: 1,
            pointer: address
        });

        if (erc20Result && erc20Result.exists) {
            isPointer = true;
            pointeeAddress = erc20Result.pointee;
        } else if (erc721Result && erc721Result.exists) {
            isPointer = true;
            pointeeAddress = erc721Result.pointee;
        }

    } else if (addressType === 'CW') {
        // Query for CW20 and CW721
        const cw20Result = await queryAPI('/sei-protocol/seichain/evm/pointee', {
            pointerType: 3,
            pointer: address
        });
        const cw721Result = await queryAPI('/sei-protocol/seichain/evm/pointee', {
            pointerType: 4,
            pointer: address
        });

        if (cw20Result && cw20Result.exists) {
            isPointer = true;
            pointeeAddress = cw20Result.pointee;
        } else if (cw721Result && cw721Result.exists) {
            isPointer = true;
            pointeeAddress = cw721Result.pointee;
        }

    } else if (addressType === 'NATIVE') {
        // Query for NATIVE tokens
        const nativeResult = await queryAPI('/sei-protocol/seichain/evm/pointer', {
            pointerType: 2,
            pointee: address
        });

        if (nativeResult && nativeResult.exists) {
            isPointer = true;
            pointerAddress = nativeResult.pointer;
        }
    }

    // Determine if it's a base asset if no pointer is found
    isBaseAsset = !isPointer;

    // Return the result object
    return {
        isBaseAsset,
        isPointer,
        pointerAddress,
        pointeeAddress
    };
}

// Test function with example queries
async function testQueries() {
    const testAddresses = [
        '0x809FF4801aA5bDb33045d1fEC810D082490D63a4', // Example EVM address
        'sei1eavtmc4y00a0ed8l9c7l0m7leesv3yetcptklv2kalz4tsgz02mqlvyea6', // Example CW address
        'ibc/CA6FBFAF399474A06263E10D0CE5AEBBE15189D6D4B2DD9ADE61007E68EB9DB0' // Example NATIVE address
    ];

    for (const address of testAddresses) {
        const result = await determineAssetProperties(address);
        console.log(`Result for ${address}:`, result);
    }
}

// Run the test
testQueries();
