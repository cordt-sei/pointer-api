import { queryAPI } from '../api/queryAPI.js';
import { log } from './logger.js';

// Define pointer type enumeration for clearer reference
const POINTER_TYPES = {
    ERC20: 0,    // ERC20 token
    ERC721: 1,   // ERC721 token (NFT)
    NATIVE: 2,   // Native token (e.g., ibc/factory)
    CW20: 3,     // CosmWasm token
    CW721: 4,    // CosmWasm NFT
    ERC1155: 5,  // ERC1155 multi-token
    CW1155: 6    // CosmWasm multi-token
};

// Define address types with their detection rules
const ADDRESS_TYPES = {
    EVM: (address) => address.startsWith('0x') && address.length === 42,
    CW: (address) => address.startsWith('sei1'),
    NATIVE: (address) => address.startsWith('ibc/') || address.startsWith('factory/'),
    UNKNOWN: () => true // Fallback
};

/**
 * Determine the type of address based on its format
 * 
 * @param {string} address - The address to check
 * @returns {string} - Address type: 'EVM', 'CW', 'NATIVE', or 'UNKNOWN'
 */
function determineAddressType(address) {
    for (const [type, matchFn] of Object.entries(ADDRESS_TYPES)) {
        if (matchFn(address)) {
            log('DEBUG', `Address type determined`, { address, type });
            return type;
        }
    }
    log('WARN', `Unknown address type`, { address });
    return 'UNKNOWN';
}

/**
 * Check if an address is a pointer to another token type
 * 
 * @param {string} address - The address to check
 * @param {string} addressType - The type of address (EVM, CW, NATIVE, UNKNOWN)
 * @returns {Promise<object>} - Pointer check result with isPointer, pointerType, and pointeeAddress 
 */
async function checkIsPointer(address, addressType) {
    // Generate a unique ID for this check process for tracking in logs
    const checkId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    
    // Define which pointer checks to run based on address type
    const pointerChecks = {
        CW: [
            // Check if CW address points to ERC20, ERC721, or ERC1155
            { endpoint: '/sei-protocol/seichain/evm/pointee', params: { pointerType: POINTER_TYPES.ERC20, pointer: address }, resultType: 'ERC20' },
            { endpoint: '/sei-protocol/seichain/evm/pointee', params: { pointerType: POINTER_TYPES.ERC721, pointer: address }, resultType: 'ERC721' },
            { endpoint: '/sei-protocol/seichain/evm/pointee', params: { pointerType: POINTER_TYPES.ERC1155, pointer: address }, resultType: 'ERC1155' }
        ],
        EVM: [
            // Check if EVM address points to CW20, CW721, CW1155, or NATIVE
            { endpoint: '/sei-protocol/seichain/evm/pointee', params: { pointerType: POINTER_TYPES.CW20, pointer: address }, resultType: 'CW20' },
            { endpoint: '/sei-protocol/seichain/evm/pointee', params: { pointerType: POINTER_TYPES.CW721, pointer: address }, resultType: 'CW721' },
            { endpoint: '/sei-protocol/seichain/evm/pointee', params: { pointerType: POINTER_TYPES.CW1155, pointer: address }, resultType: 'CW1155' },
            { endpoint: '/sei-protocol/seichain/evm/pointee', params: { pointerType: POINTER_TYPES.NATIVE, pointer: address }, resultType: 'NATIVE' }
        ]
    };

    // Only run checks if we have defined them for this address type
    if (!pointerChecks[addressType]) {
        log('DEBUG', `No pointer checks defined for address type ${addressType}`, { checkId, address });
        return { isPointer: false };
    }

    // Log what we're checking
    log('DEBUG', `Running pointer checks for ${address}`, { 
        checkId,
        addressType, 
        checkCount: pointerChecks[addressType].length,
        checks: pointerChecks[addressType].map(c => c.resultType)
    });

    // Run all checks in parallel
    const results = await Promise.all(
        pointerChecks[addressType].map(async check => {
            try {
                const result = await queryAPI(check.endpoint, check.params);
                return { check, result };
            } catch (error) {
                log('ERROR', `Error during pointer check for ${address}`, {
                    checkId,
                    check: check.resultType,
                    error: error.message,
                    stack: error.stack
                });
                return { check, result: null };
            }
        })
    );

    // Process results
    for (const { check, result } of results) {
        // Check if we got a valid result and it exists
        if (result && result.exists) {
            log('DEBUG', `Found ${check.resultType} pointee for ${address}`, { 
                checkId,
                pointee: result.pointee,
                version: result.version
            });
            
            return { 
                isPointer: true, 
                pointerType: check.resultType,
                pointeeAddress: result.pointee
            };
        } else if (result) {
            // We got a response but the pointer doesn't exist
            log('DEBUG', `${address} is not a ${check.resultType} pointer`, {
                checkId,
                exists: false,
                responseReceived: true
            });
        } else {
            // We didn't get a valid response
            log('WARN', `Failed to determine if ${address} is a ${check.resultType} pointer`, {
                checkId,
                responseReceived: false
            });
        }
    }

    log('DEBUG', `${address} is not a pointer to any asset type`, { checkId });
    return { isPointer: false };
}

/**
 * Check if a base asset has a pointer of any type
 * 
 * @param {string} address - The address to check
 * @param {string} addressType - The type of address (EVM, CW, NATIVE, UNKNOWN)
 * @returns {Promise<object>} - Base asset check result with pointerAddress and pointerType
 */
async function checkBaseAssetPointer(address, addressType) {
    // Generate a unique ID for this check process for tracking in logs
    const checkId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    
    // Define which base asset checks to run based on address type
    const baseChecks = {
        CW: [
            // Check if CW address has an ERC20, ERC721, or ERC1155 pointer
            { endpoint: '/sei-protocol/seichain/evm/pointer', params: { pointerType: POINTER_TYPES.CW20, pointee: address }, resultType: 'CW20' },
            { endpoint: '/sei-protocol/seichain/evm/pointer', params: { pointerType: POINTER_TYPES.CW721, pointee: address }, resultType: 'CW721' },
            { endpoint: '/sei-protocol/seichain/evm/pointer', params: { pointerType: POINTER_TYPES.CW1155, pointee: address }, resultType: 'CW1155' }
        ],
        EVM: [
            // Check if EVM address has a CW20, CW721, or CW1155 pointer
            { endpoint: '/sei-protocol/seichain/evm/pointer', params: { pointerType: POINTER_TYPES.ERC20, pointee: address }, resultType: 'ERC20' },
            { endpoint: '/sei-protocol/seichain/evm/pointer', params: { pointerType: POINTER_TYPES.ERC721, pointee: address }, resultType: 'ERC721' },
            { endpoint: '/sei-protocol/seichain/evm/pointer', params: { pointerType: POINTER_TYPES.ERC1155, pointee: address }, resultType: 'ERC1155' }
        ],
        NATIVE: [
            // Check if native token has an EVM pointer
            { endpoint: '/sei-protocol/seichain/evm/pointer', params: { pointerType: POINTER_TYPES.NATIVE, pointee: address }, resultType: 'NATIVE' }
        ]
    };

    // Only run checks if we have defined them for this address type
    if (!baseChecks[addressType]) {
        log('DEBUG', `No base asset checks defined for address type ${addressType}`, { checkId, address });
        return { pointerAddress: '', pointerType: addressType };
    }

    // Log what we're checking
    log('DEBUG', `Running base asset checks for ${address}`, { 
        checkId,
        addressType, 
        checkCount: baseChecks[addressType].length,
        checks: baseChecks[addressType].map(c => c.resultType) 
    });

    // Run all checks in parallel
    const results = await Promise.all(
        baseChecks[addressType].map(async check => {
            try {
                const result = await queryAPI(check.endpoint, check.params);
                return { check, result };
            } catch (error) {
                log('ERROR', `Error during base asset check for ${address}`, {
                    checkId,
                    check: check.resultType,
                    error: error.message,
                    stack: error.stack
                });
                return { check, result: null };
            }
        })
    );

    // Process results
    for (const { check, result } of results) {
        // Check if we got a valid result and it exists
        if (result && result.exists) {
            log('DEBUG', `Found ${check.resultType} pointer for ${address}`, { 
                checkId,
                pointer: result.pointer,
                version: result.version
            });
            
            return { 
                pointerAddress: result.pointer,
                pointerType: check.resultType
            };
        } else if (result) {
            // We got a response but the pointer doesn't exist
            log('DEBUG', `${address} doesn't have a ${check.resultType} pointer`, {
                checkId,
                exists: false,
                responseReceived: true
            });
        } else {
            // We didn't get a valid response
            log('WARN', `Failed to determine if ${address} has a ${check.resultType} pointer`, {
                checkId,
                responseReceived: false
            });
        }
    }

    log('DEBUG', `${address} doesn't have any pointers`, { checkId });
    return { pointerAddress: '', pointerType: addressType };
}

/**
 * Main function to determine asset properties for any address
 * 
 * @param {string} address - The address to analyze
 * @returns {Promise<object>} - Complete asset properties
 */
export async function determineAssetProperties(address) {
    // Generate a unique process ID for tracking in logs
    const processId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    
    try {
        // Determine address type (CW, EVM, NATIVE, UNKNOWN)
        const addressType = determineAddressType(address);
        log('DEBUG', `Processing ${address}`, { processId, type: addressType });

        // For NATIVE assets, we know they are always base assets
        // Just need to check if they have an EVM pointer
        if (addressType === 'NATIVE') {
            log('DEBUG', `${address} is a NATIVE asset, checking for EVM pointer`, { processId });
            const baseAssetCheck = await checkBaseAssetPointer(address, addressType);
            
            const result = {
                address,
                isBaseAsset: true,     // NATIVE assets are always base assets
                isPointer: false,
                pointerType: 'NATIVE',
                pointerAddress: baseAssetCheck.pointerAddress,
                pointeeAddress: ''
            };
            
            log('DEBUG', `Final result for NATIVE asset ${address}`, { processId, result });
            return result;
        }
        
        // First check if it's a pointer to something else
        log('DEBUG', `Checking if ${address} is a pointer to another asset`, { processId });
        const pointerCheck = await checkIsPointer(address, addressType);
        
        // If it's a pointer, return pointer details
        if (pointerCheck.isPointer) {
            const result = {
                address,
                isBaseAsset: false,
                isPointer: true,
                pointerType: pointerCheck.pointerType,
                pointerAddress: '',
                pointeeAddress: pointerCheck.pointeeAddress
            };
            
            log('DEBUG', `${address} is a ${pointerCheck.pointerType} pointer to ${pointerCheck.pointeeAddress}`, { processId });
            return result;
        }
        
        // If not a pointer, check if it's a base asset with a pointer
        log('DEBUG', `${address} is not a pointer, checking if it's a base asset with a pointer`, { processId });
        const baseAssetCheck = await checkBaseAssetPointer(address, addressType);
        
        // Early return if no pointer was found
        if (!baseAssetCheck.pointerAddress) {
            log('DEBUG', `${address} is a base asset with no pointer`, { processId });
            return {
                address,
                isBaseAsset: true,
                isPointer: false,
                pointerType: addressType,
                pointerAddress: '',
                pointeeAddress: ''
            };
        }
        
        // Return base asset details with pointer information
        const result = {
            address,
            isBaseAsset: true,
            isPointer: false,
            pointerType: baseAssetCheck.pointerType,
            pointerAddress: baseAssetCheck.pointerAddress,
            pointeeAddress: ''
        };

        log('DEBUG', `Final result for ${address}`, { processId, result });
        return result;

    } catch (error) {
        log('ERROR', `Error determining properties for ${address}`, { 
            processId,
            error: error.message,
            stack: error.stack
        });
        return { error: `Failed to determine properties for ${address}` };
    }
}