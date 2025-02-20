const { queryAPI } = require('../api/queryAPI');

// Enable debugging logs if set to `true`
const DEBUG = false; 

function determineAddressType(address) {
    if (address.startsWith('0x') && address.length === 42) return 'MIXED';
    if (address.startsWith('sei1')) return 'CW';
    if (address.startsWith('ibc/') || address.startsWith('factory/')) return 'NATIVE';
    return 'UNKNOWN';
}

async function determineAssetProperties(address) {
    const addressType = determineAddressType(address);
    let isBaseAsset = true;
    let isPointer = false;
    let pointerAddress = '';
    let pointeeAddress = '';
    let pointerType = addressType;

    try {
        if (DEBUG) console.log(`🔍 Processing ${address} | Type: ${addressType}`);

        if (addressType === 'CW') {
            const [erc20Pointer, erc721Pointer, cw20Base, cw721Base] = await Promise.all([
                queryAPI('/sei-protocol/seichain/evm/pointee', { pointerType: 0, pointer: address }),
                queryAPI('/sei-protocol/seichain/evm/pointee', { pointerType: 1, pointer: address }),
                queryAPI('/sei-protocol/seichain/evm/pointer', { pointerType: 3, pointee: address }),
                queryAPI('/sei-protocol/seichain/evm/pointer', { pointerType: 4, pointee: address })
            ]);

            if (erc20Pointer?.exists) {
                isPointer = true;
                isBaseAsset = false;
                pointeeAddress = erc20Pointer.pointee;
                pointerType = 'ERC20';
            } else if (erc721Pointer?.exists) {
                isPointer = true;
                isBaseAsset = false;
                pointeeAddress = erc721Pointer.pointee;
                pointerType = 'ERC721';
            } else if (cw20Base?.exists) {
                pointerAddress = cw20Base.pointer;
                pointerType = 'CW20';
            } else if (cw721Base?.exists) {
                pointerAddress = cw721Base.pointer;
                pointerType = 'CW721';
            }

        } else if (addressType === 'MIXED') {
            const [cw20Pointer, cw721Pointer, nativePointer, erc20Base, erc721Base] = await Promise.all([
                queryAPI('/sei-protocol/seichain/evm/pointee', { pointerType: 3, pointer: address }),
                queryAPI('/sei-protocol/seichain/evm/pointee', { pointerType: 4, pointer: address }),
                queryAPI('/sei-protocol/seichain/evm/pointee', { pointerType: 2, pointer: address }),
                queryAPI('/sei-protocol/seichain/evm/pointer', { pointerType: 0, pointee: address }),
                queryAPI('/sei-protocol/seichain/evm/pointer', { pointerType: 1, pointee: address })
            ]);

            if (cw20Pointer?.exists) {
                isPointer = true;
                isBaseAsset = false;
                pointeeAddress = cw20Pointer.pointee;
                pointerType = 'CW20';
            } else if (cw721Pointer?.exists) {
                isPointer = true;
                isBaseAsset = false;
                pointeeAddress = cw721Pointer.pointee;
                pointerType = 'CW721';
            } else if (nativePointer?.exists) {
                isPointer = true;
                isBaseAsset = false;
                pointeeAddress = nativePointer.pointee;
                pointerType = 'NATIVE';
            } else if (erc20Base?.exists) {
                pointerAddress = erc20Base.pointer;
                pointerType = 'ERC20';
            } else if (erc721Base?.exists) {
                pointerAddress = erc721Base.pointer;
                pointerType = 'ERC721';
            }

        } else if (addressType === 'NATIVE') {
            const nativeResult = await queryAPI('/sei-protocol/seichain/evm/pointer', { pointerType: 2, pointee: address });

            if (nativeResult?.exists) {
                isBaseAsset = true;
                isPointer = false;
                pointerAddress = nativeResult.pointer;
            }
            pointerType = 'NATIVE';

        } else {
            pointerType = 'UNKNOWN';
        }

        if (DEBUG) console.log(`✅ Final result for ${address}: ${JSON.stringify({ isBaseAsset, isPointer, pointerType })}`);

        return {
            address,
            isBaseAsset,
            isPointer,
            pointerType,
            pointerAddress,
            pointeeAddress
        };

    } catch (error) {
        console.error(`❌ Error determining properties for ${address}:`, error.message);
        return { error: `Failed to determine properties for ${address}` };
    }
}

module.exports = { determineAssetProperties };
