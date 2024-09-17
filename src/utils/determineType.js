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

    if (addressType === 'CW') {
        // Check if the sei1 address is a pointer to an ERC20 or ERC721 asset
        const erc20PointerResult = await queryAPI('/sei-protocol/seichain/evm/pointee', { pointerType: 0, pointer: address });
        const erc721PointerResult = await queryAPI('/sei-protocol/seichain/evm/pointee', { pointerType: 1, pointer: address });

        if (erc20PointerResult && erc20PointerResult.exists) {
            isPointer = true;
            pointeeAddress = erc20PointerResult.pointee; // The ERC20 asset it points to
        } else if (erc721PointerResult && erc721PointerResult.exists) {
            isPointer = true;
            pointeeAddress = erc721PointerResult.pointee; // The ERC721 asset it points to
        } else {
            // Check if it is a natural CW20 or CW721 asset
            const cw20BaseResult = await queryAPI('/sei-protocol/seichain/evm/pointer', { pointerType: 3, pointee: address });
            const cw721BaseResult = await queryAPI('/sei-protocol/seichain/evm/pointer', { pointerType: 4, pointee: address });

            if (cw20BaseResult && cw20BaseResult.exists) {
                isBaseAsset = true;
                pointerAddress = cw20BaseResult.pointer;
            } else if (cw721BaseResult && cw721BaseResult.exists) {
                isBaseAsset = true;
                pointerAddress = cw721BaseResult.pointer;
            } else {
                // If no pointers are found, it's a natural CW20/CW721 asset
                isBaseAsset = true;
            }
        }

    } else if (addressType === 'MIXED') {
        // Check if 0x address is a pointer for CW20, CW721, or a native asset (ibc/factory)
        const cw20PointerResult = await queryAPI('/sei-protocol/seichain/evm/pointee', { pointerType: 3, pointer: address });
        const cw721PointerResult = await queryAPI('/sei-protocol/seichain/evm/pointee', { pointerType: 4, pointer: address });
        const nativePointerResult = await queryAPI('/sei-protocol/seichain/evm/pointee', { pointerType: 2, pointer: address });

        if (cw20PointerResult && cw20PointerResult.exists) {
            isPointer = true;
            pointeeAddress = cw20PointerResult.pointee; // Points to CW20 asset
        } else if (cw721PointerResult && cw721PointerResult.exists) {
            isPointer = true;
            pointeeAddress = cw721PointerResult.pointee; // Points to CW721 asset
        } else if (nativePointerResult && nativePointerResult.exists) {
            isPointer = true;
            pointeeAddress = nativePointerResult.pointee; // Points to a NATIVE asset
        } else {
            // Check if it's a natural ERC20/ERC721 asset
            const erc20BaseResult = await queryAPI('/sei-protocol/seichain/evm/pointer', { pointerType: 0, pointee: address });
            const erc721BaseResult = await queryAPI('/sei-protocol/seichain/evm/pointer', { pointerType: 1, pointee: address });

            if (erc20BaseResult && erc20BaseResult.exists) {
                isBaseAsset = true;
                pointerAddress = erc20BaseResult.pointer;
            } else if (erc721BaseResult && erc721BaseResult.exists) {
                isBaseAsset = true;
                pointerAddress = erc721BaseResult.pointer;
            } else {
                // If no pointers are found, it's a natural ERC20/ERC721 asset
                isBaseAsset = true;
            }
        }

    } else if (addressType === 'NATIVE') {
        // Check if factory/ibc address has a pointer
        const nativePointerCheck = await queryAPI('/sei-protocol/seichain/evm/pointer', { pointerType: 2, pointee: address });

        if (nativePointerCheck && nativePointerCheck.exists) {
            isBaseAsset = true;
            pointerAddress = nativePointerCheck.pointer; // Points to a 0x address
        } else {
            isBaseAsset = true; // It remains a native base asset
        }
    }

    // Default to base asset if no matches found
    if (!isPointer && !isBaseAsset) {
        isBaseAsset = true;
    }

    return {
        address,
        isBaseAsset,
        isPointer,
        pointerAddress,
        pointeeAddress
    };
}

module.exports = { determineAssetProperties };
