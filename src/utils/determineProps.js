const { queryAPI } = require('../api/queryAPI');

function determineAddressType(address) {
    if (address.startsWith('0x') && address.length === 42) {
        return 'MIXED'; // Can be ERC20/ERC721 natural, pointer for CW20/CW721, or NATIVE
    } else if (address.startsWith('sei1')) {
        return 'CW'; // Can be CW20/CW721 natural or pointer for ERC20/ERC721
    } else if (address.startsWith('ibc/') || address.startsWith('factory/')) {
        return 'NATIVE'; // Native base assets
    } else {
        return 'UNKNOWN';
    }
}

async function determineAssetProperties(address) {
    const addressType = determineAddressType(address);
    let isBaseAsset = true;  // default: assume it's a natural asset
    let isPointer = false;
    let pointerAddress = '';
    let pointeeAddress = '';
    let pointerType = addressType; // default pointerType is the address type

    try {
        if (addressType === 'CW') {
            // For CW addresses, run concurrent queries for pointer and base assets
            const [erc20Pointer, erc721Pointer, cw20Base, cw721Base] = await Promise.all([
                queryAPI('/sei-protocol/seichain/evm/pointee', { pointerType: 0, pointer: address }),
                queryAPI('/sei-protocol/seichain/evm/pointee', { pointerType: 1, pointer: address }),
                queryAPI('/sei-protocol/seichain/evm/pointer', { pointerType: 3, pointee: address }),
                queryAPI('/sei-protocol/seichain/evm/pointer', { pointerType: 4, pointee: address })
            ]);

            if (erc20Pointer && erc20Pointer.exists) {
                isPointer = true;
                pointeeAddress = erc20Pointer.pointee;
                pointerType = 'ERC20';
            } else if (erc721Pointer && erc721Pointer.exists) {
                isPointer = true;
                pointeeAddress = erc721Pointer.pointee;
                pointerType = 'ERC721';
            } else if (cw20Base && cw20Base.exists) {
                isBaseAsset = true;
                pointerAddress = cw20Base.pointer;
                pointerType = 'CW20';
            } else if (cw721Base && cw721Base.exists) {
                isBaseAsset = true;
                pointerAddress = cw721Base.pointer;
                pointerType = 'CW721';
            } else {
                // If no pointer info is found, treat it as a natural CW asset.
                pointerType = 'CW';
            }

        } else if (addressType === 'MIXED') {
            // For MIXED addresses, try CW pointer queries, native pointer query, then ERC base queries.
            const [cw20Pointer, cw721Pointer, nativePointer, erc20Base, erc721Base] = await Promise.all([
                queryAPI('/sei-protocol/seichain/evm/pointee', { pointerType: 3, pointer: address }),
                queryAPI('/sei-protocol/seichain/evm/pointee', { pointerType: 4, pointer: address }),
                queryAPI('/sei-protocol/seichain/evm/pointee', { pointerType: 2, pointer: address }),
                queryAPI('/sei-protocol/seichain/evm/pointer', { pointerType: 0, pointee: address }),
                queryAPI('/sei-protocol/seichain/evm/pointer', { pointerType: 1, pointee: address })
            ]);

            if (cw20Pointer && cw20Pointer.exists) {
                isPointer = true;
                pointeeAddress = cw20Pointer.pointee;
                pointerType = 'CW20';
            } else if (cw721Pointer && cw721Pointer.exists) {
                isPointer = true;
                pointeeAddress = cw721Pointer.pointee;
                pointerType = 'CW721';
            } else if (nativePointer && nativePointer.exists) {
                isPointer = true;
                pointeeAddress = nativePointer.pointee;
                pointerType = 'NATIVE';
            } else if (erc20Base && erc20Base.exists) {
                isBaseAsset = true;
                pointerAddress = erc20Base.pointer;
                pointerType = 'ERC20';
            } else if (erc721Base && erc721Base.exists) {
                isBaseAsset = true;
                pointerAddress = erc721Base.pointer;
                pointerType = 'ERC721';
            } else {
                pointerType = 'MIXED';
            }

        } else if (addressType === 'NATIVE') {
            // For NATIVE addresses, check the pointer endpoint.
            const nativeResult = await queryAPI('/sei-protocol/seichain/evm/pointer', { pointerType: 2, pointee: address });
            if (nativeResult && nativeResult.exists) {
                isPointer = true;
                pointerAddress = nativeResult.pointer;
                pointerType = 'NATIVE';
            } else {
                // If not found as a pointer, it remains a natural asset.
                isBaseAsset = true;
                pointerType = 'NATIVE';
            }
        } else {
            // For UNKNOWN type, default to base asset.
            isBaseAsset = true;
            pointerType = 'UNKNOWN';
        }

        // Final fallback: if nothing was detected as pointer, assume base asset.
        if (!isPointer && !isBaseAsset) {
            isBaseAsset = true;
        }

        return {
            address,
            isBaseAsset,
            isPointer,
            pointerType: pointerType || undefined,
            pointerAddress,
            pointeeAddress
        };

    } catch (error) {
        console.error(`Error determining properties for address ${address}:`, error.message);
        return { error: `Failed to determine properties for address ${address}` };
    }
}

module.exports = { determineAssetProperties };
