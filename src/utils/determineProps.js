import { queryAPI } from '../api/queryAPI.js';
import { log } from './logger.js';

// Define pointer type enumeration for clearer reference
const POINTER_TYPES = {
    ERC20: 0,    // EVM token
    ERC721: 1,   // EVM NFT
    NATIVE: 2,   // Native token
    CW20: 3,     // CW token
    CW721: 4,    // CW NFT
    ERC1155: 5,  // EVM multi-token
    CW1155: 6    // CW multi-token
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
 * Get the most likely pointer types to check based on address type
 * 
 * @param {string} addressType - The type of address (EVM, CW, NATIVE)
 * @returns {Array} - Prioritized list of pointer types to check
 */
function getPrioritizedPointerChecks(addressType) {
    switch (addressType) {
        case 'EVM':
            // Check CW20 first, then CW721/CW1155/NATIVE
            return [
                { endpoint: '/sei-protocol/seichain/evm/pointee', params: { pointerType: POINTER_TYPES.CW20, pointer: null }, resultType: 'CW20' },
                { endpoint: '/sei-protocol/seichain/evm/pointee', params: { pointerType: POINTER_TYPES.CW721, pointer: null }, resultType: 'CW721' },
                { endpoint: '/sei-protocol/seichain/evm/pointee', params: { pointerType: POINTER_TYPES.CW1155, pointer: null }, resultType: 'CW1155' },
                { endpoint: '/sei-protocol/seichain/evm/pointee', params: { pointerType: POINTER_TYPES.NATIVE, pointer: null }, resultType: 'NATIVE' }
            ];
        case 'CW':
            // Check ERC20 first, then ERC721/ERC1155
            return [
                { endpoint: '/sei-protocol/seichain/evm/pointee', params: { pointerType: POINTER_TYPES.ERC20, pointer: null }, resultType: 'ERC20' },
                { endpoint: '/sei-protocol/seichain/evm/pointee', params: { pointerType: POINTER_TYPES.ERC721, pointer: null }, resultType: 'ERC721' },
                { endpoint: '/sei-protocol/seichain/evm/pointee', params: { pointerType: POINTER_TYPES.ERC1155, pointer: null }, resultType: 'ERC1155' }
            ];
        default:
            return [];
    }
}

/**
 * Get the most likely base asset checks based on address type
 * 
 * @param {string} addressType - The type of address (EVM, CW, NATIVE)
 * @returns {Array} - Prioritized list of base asset types to check
 */
function getPrioritizedBaseAssetChecks(addressType) {
    switch (addressType) {
        case 'EVM':
            // Check ERC20 first, then ERC721/ERC1155
            return [
                { endpoint: '/sei-protocol/seichain/evm/pointer', params: { pointerType: POINTER_TYPES.ERC20, pointee: null }, resultType: 'ERC20' },
                { endpoint: '/sei-protocol/seichain/evm/pointer', params: { pointerType: POINTER_TYPES.ERC721, pointee: null }, resultType: 'ERC721' },
                { endpoint: '/sei-protocol/seichain/evm/pointer', params: { pointerType: POINTER_TYPES.ERC1155, pointee: null }, resultType: 'ERC1155' }
            ];
        case 'CW':
            // Check CW20 first, then CW721/CW1155
            return [
                { endpoint: '/sei-protocol/seichain/evm/pointer', params: { pointerType: POINTER_TYPES.CW20, pointee: null }, resultType: 'CW20' },
                { endpoint: '/sei-protocol/seichain/evm/pointer', params: { pointerType: POINTER_TYPES.CW721, pointee: null }, resultType: 'CW721' },
                { endpoint: '/sei-protocol/seichain/evm/pointer', params: { pointerType: POINTER_TYPES.CW1155, pointee: null }, resultType: 'CW1155' }
            ];
        case 'NATIVE':
            // NATIVE base assets only have NATIVE pointers
            return [
                { endpoint: '/sei-protocol/seichain/evm/pointer', params: { pointerType: POINTER_TYPES.NATIVE, pointee: null }, resultType: 'NATIVE' }
            ];
        default:
            return [];
    }
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
    
    // Get prioritized checks for this address type
    const pointerChecks = getPrioritizedPointerChecks(addressType);
    
    // If no checks defined for this address type, return early
    if (pointerChecks.length === 0) {
        log('DEBUG', `No pointer checks defined for address type ${addressType}`, { checkId, address });
        return { isPointer: false };
    }

    // Set the address in all check parameters
    pointerChecks.forEach(check => check.params.pointer = address);
    
    // Log what we're checking
    log('DEBUG', `Running pointer checks for ${address}`, { 
        checkId,
        addressType, 
        checkCount: pointerChecks.length,
        checks: pointerChecks.map(c => c.resultType)
    });

    // Run checks sequentially until we find a match
    for (const check of pointerChecks) {
        try {
            log('DEBUG', `Running check for ${check.resultType} pointer type`, {
                checkId,
                address,
                pointerType: check.params.pointerType
            });
            
            const result = await queryAPI(check.endpoint, check.params);
            
            // Log the result
            log('DEBUG', `Got result for ${check.resultType} check`, {
                checkId,
                result,
                exists: result ? result.exists : false,
                pointee: result && result.exists ? result.pointee : null
            });
            
            // If we got a valid result with exists=true, we found a match
            if (result && result.exists) {
                // Check if the pointee is a NATIVE asset (ibc/ or factory/)
                if (result.pointee && (result.pointee.startsWith('ibc/') || result.pointee.startsWith('factory/'))) {
                    log('DEBUG', `Pointee ${result.pointee} is a NATIVE asset, overriding pointer type from ${check.resultType} to NATIVE`, { 
                        checkId,
                        originalType: check.resultType,
                        pointee: result.pointee,
                        version: result.version
                    });
                    
                    return { 
                        isPointer: true, 
                        pointerType: 'NATIVE',  // Override to NATIVE
                        pointeeAddress: result.pointee
                    };
                }
                
                // Otherwise use the detected type
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
            }
            
            if (result) {
                log('DEBUG', `${address} is not a ${check.resultType} pointer`, {
                    checkId,
                    exists: false
                });
            }
        } catch (error) {
            log('ERROR', `Error during pointer check for ${address}`, {
                checkId,
                check: check.resultType,
                error: error.message,
                stack: error.stack
            });
        }
    }

    // If we get here, no pointer was found
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
    
    // Get prioritized base asset checks for this address type
    const baseChecks = getPrioritizedBaseAssetChecks(addressType);
    
    // If no checks defined for this address type, return early
    if (baseChecks.length === 0) {
        log('DEBUG', `No base asset checks defined for address type ${addressType}`, { checkId, address });
        return { pointerAddress: '', pointerType: addressType };
    }

    // Set the address in all check parameters
    baseChecks.forEach(check => check.params.pointee = address);
    
    // Log what we're checking
    log('DEBUG', `Running base asset checks for ${address}`, { 
        checkId,
        addressType, 
        checkCount: baseChecks.length,
        checks: baseChecks.map(c => c.resultType) 
    });

    // Run checks sequentially until we find a match
    for (const check of baseChecks) {
        try {
            log('DEBUG', `Running base asset check for ${check.resultType}`, {
                checkId,
                address,
                pointerType: check.params.pointerType
            });
            
            const result = await queryAPI(check.endpoint, check.params);
            
            // Log the result
            log('DEBUG', `Got result for ${check.resultType} base asset check`, {
                checkId,
                result,
                exists: result ? result.exists : false,
                pointer: result && result.exists ? result.pointer : null
            });
            
            // If we got a valid result with exists=true, we found a match
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
            }
            
            if (result) {
                log('DEBUG', `${address} doesn't have a ${check.resultType} pointer`, {
                    checkId,
                    exists: false
                });
            }
        } catch (error) {
            log('ERROR', `Error during base asset check for ${address}`, {
                checkId,
                check: check.resultType,
                error: error.message,
                stack: error.stack
            });
        }
    }

    // If we get here, no pointers were found
    log('DEBUG', `${address} doesn't have any pointers`, { checkId });
    return { pointerAddress: '', pointerType: addressType };
}

/**
 * Performs pre-check analysis of an address to determine most likely asset type
 * 
 * @param {string} address - The address to analyze
 * @param {string} addressType - The type of address (EVM, CW, NATIVE)
 * @returns {object} - Pre-check analysis results to guide further checking
 */
function performAddressPreCheck(address, addressType) {
    // For native assets, we know they're always base assets
    if (addressType === 'NATIVE') {
        return {
            isLikelyBaseAsset: true,
            isLikelyPointer: false
        };
    }

    // For EVM addresses, check specific patterns
    if (addressType === 'EVM') {
        // This could be expanded with address pattern recognition
        // For example, if certain address ranges are known to be pointers
        return {
            // For now, assume equally likely
            isLikelyBaseAsset: true,
            isLikelyPointer: true
        };
    }

    // For CW addresses, check specific patterns
    if (addressType === 'CW') {
        // This could be expanded with address pattern recognition
        return {
            // For now, assume equally likely
            isLikelyBaseAsset: true,
            isLikelyPointer: true
        };
    }

    // Default for unknown address types
    return {
        isLikelyBaseAsset: true,
        isLikelyPointer: false
    };
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
        // Check for manual override: null address (0x0000...) points to native usei
        if (address === '0x0000000000000000000000000000000000000000') {
            log('DEBUG', `Manual override for null address ${address}`, { processId });
            return {
                address: '0x0000000000000000000000000000000000000000',
                isBaseAsset: false,
                isPointer: true,
                pointerType: 'NATIVE',
                pointerAddress: '',
                pointeeAddress: 'usei'
            };
        }
        
        // Determine address type (CW, EVM, NATIVE, UNKNOWN)
        const addressType = determineAddressType(address);
        log('DEBUG', `Processing ${address}`, { processId, type: addressType });

        // Perform pre-check analysis to guide query strategy
        const preCheck = performAddressPreCheck(address, addressType);

        // For NATIVE assets, we know they are always base assets
        // Just need to check if they have a NATIVE pointer
        if (addressType === 'NATIVE') {
            log('DEBUG', `${address} is a NATIVE asset, checking for NATIVE pointer`, { processId });
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
        
        // Always check both pointer and base asset status
        let isPointer = false;
        let pointerType = '';
        let pointeeAddress = '';
        let pointerAddress = '';
        
        // First, check if the address is a pointer to another asset
        log('DEBUG', `Checking if ${address} is a pointer to another asset`, { processId });
        const pointerCheck = await checkIsPointer(address, addressType);
        
        if (pointerCheck.isPointer) {
            isPointer = true;
            pointerType = pointerCheck.pointerType;
            pointeeAddress = pointerCheck.pointeeAddress;
            
            log('DEBUG', `${address} is a ${pointerType} pointer to ${pointeeAddress}`, { processId });
        }
        
        // Always check if it's a base asset with a pointer (even if it's also a pointer)
        if (!isPointer) {
            log('DEBUG', `Checking if ${address} is a base asset with a pointer`, { processId });
            const baseAssetCheck = await checkBaseAssetPointer(address, addressType);
            
            if (baseAssetCheck.pointerAddress) {
                pointerAddress = baseAssetCheck.pointerAddress;
                pointerType = baseAssetCheck.pointerType;
                
                log('DEBUG', `${address} is a base asset with ${pointerType} pointer: ${pointerAddress}`, { processId });
            }
        }
        
        // Return the complete asset information
        if (isPointer) {
            return {
                address,
                isBaseAsset: false,
                isPointer: true,
                pointerType,
                pointerAddress: '',
                pointeeAddress
            };
        } else {
            return {
                address,
                isBaseAsset: true,
                isPointer: false,
                pointerType: pointerType || addressType,
                pointerAddress: pointerAddress || '',
                pointeeAddress: ''
            };
        }
    } catch (error) {
        log('ERROR', `Error determining properties for ${address}`, { 
            processId,
            error: error.message,
            stack: error.stack
        });
        return { error: `Failed to determine properties for ${address}` };
    }
}