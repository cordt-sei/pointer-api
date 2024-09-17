const { queryAPI } = require('../api/queryAPI');

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

async function determineAssetProperties(address) {
    const addressType = determineAddressType(address);
    let isBaseAsset = false;
    let isPointer = false;
    let pointerAddress = '';
    let pointeeAddress = '';

    if (addressType === 'EVM') {
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
        const nativeResult = await queryAPI('/sei-protocol/seichain/evm/pointer', {
            pointerType: 2,
            pointee: address
        });

        if (nativeResult && nativeResult.exists) {
            isPointer = true;
            pointerAddress = nativeResult.pointer;
        }
    }

    isBaseAsset = !isPointer;

    return {
        isBaseAsset,
        isPointer,
        pointerAddress,
        pointeeAddress
    };
}

module.exports = { determineAssetProperties };
