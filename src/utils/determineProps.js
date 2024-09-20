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
    let isBaseAsset = false;
    let isPointer = false;
    let pointerAddress = '';
    let pointeeAddress = '';
    let pointerType = '';

    try {
        if (addressType === 'CW') {
            // Make concurrent API calls for CW type
            const [erc20PointerResult, erc721PointerResult, cw20BaseResult, cw721BaseResult] = await Promise.all([
                queryAPI('/sei-protocol/seichain/evm/pointee', { pointerType: 0, pointer: address }),
                queryAPI('/sei-protocol/seichain/evm/pointee', { pointerType: 1, pointer: address }),
                queryAPI('/sei-protocol/seichain/evm/pointer', { pointerType: 3, pointee: address }),
                queryAPI('/sei-protocol/seichain/evm/pointer', { pointerType: 4, pointee: address })
            ]);

            if (erc20PointerResult && erc20PointerResult.exists) {
                isPointer = true;
                pointeeAddress = erc20PointerResult.pointee;
                pointerType = 'ERC20';  // Set pointerType to ERC20
            } else if (erc721PointerResult && erc721PointerResult.exists) {
                isPointer = true;
                pointeeAddress = erc721PointerResult.pointee;
                pointerType = 'ERC721';  // Set pointerType to ERC721
            } else if (cw20BaseResult && cw20BaseResult.exists) {
                isBaseAsset = true;
                pointerAddress = cw20BaseResult.pointer;
                pointerType = 'CW20';  // Set pointerType to CW20
            } else if (cw721BaseResult && cw721BaseResult.exists) {
                isBaseAsset = true;
                pointerAddress = cw721BaseResult.pointer;
                pointerType = 'CW721';  // Set pointerType to CW721
            } else {
                isBaseAsset = true; // It's a natural CW20/CW721 asset if no pointers are found
            }

        } else if (addressType === 'MIXED') {
            // Make concurrent API calls for MIXED type
            const [cw20PointerResult, cw721PointerResult, nativePointerResult, erc20BaseResult, erc721BaseResult] = await Promise.all([
                queryAPI('/sei-protocol/seichain/evm/pointee', { pointerType: 3, pointer: address }),
                queryAPI('/sei-protocol/seichain/evm/pointee', { pointerType: 4, pointer: address }),
                queryAPI('/sei-protocol/seichain/evm/pointee', { pointerType: 2, pointer: address }),
                queryAPI('/sei-protocol/seichain/evm/pointer', { pointerType: 0, pointee: address }),
                queryAPI('/sei-protocol/seichain/evm/pointer', { pointerType: 1, pointee: address })
            ]);

            if (cw20PointerResult && cw20PointerResult.exists) {
                isPointer = true;
                pointeeAddress = cw20PointerResult.pointee;
                pointerType = 'CW20';  // Set pointerType to CW20
            } else if (cw721PointerResult && cw721PointerResult.exists) {
                isPointer = true;
                pointeeAddress = cw721PointerResult.pointee;
                pointerType = 'CW721';  // Set pointerType to CW721
            } else if (nativePointerResult && nativePointerResult.exists) {
                isPointer = true;
                pointeeAddress = nativePointerResult.pointee;
                // No need to set pointerType for native assets, as it's obvious
            } else if (erc20BaseResult && erc20BaseResult.exists) {
                isBaseAsset = true;
                pointerAddress = erc20BaseResult.pointer;
                pointerType = 'ERC20';  // Set pointerType to ERC20
            } else if (erc721BaseResult && erc721BaseResult.exists) {
                isBaseAsset = true;
                pointerAddress = erc721BaseResult.pointer;
                pointerType = 'ERC721';  // Set pointerType to ERC721
            } else {
                isBaseAsset = true; // It's a natural ERC20/ERC721 asset
            }

        } else if (addressType === 'NATIVE') {
            // Make concurrent API call for NATIVE type
            const nativePointerCheck = await queryAPI('/sei-protocol/seichain/evm/pointer', { pointerType: 2, pointee: address });

            if (nativePointerCheck && nativePointerCheck.exists) {
                isBaseAsset = true;
                pointerAddress = nativePointerCheck.pointer;
            } else {
                isBaseAsset = true; // It remains a native base asset
            }
        }

        // Default to base asset if no matches are found
        if (!isPointer && !isBaseAsset) {
            isBaseAsset = true;
        }

        return {
            address,
            isBaseAsset,
            isPointer,
            pointerType: pointerType || undefined,  // Only include pointerType if it's set
            pointerAddress,
            pointeeAddress
        };

    } catch (error) {
        console.error(`Error determining properties for address ${address}:`, error.message);
        return { error: `Failed to determine properties for address ${address}` };
    }
}

module.exports = { determineAssetProperties, determineAddressType };
