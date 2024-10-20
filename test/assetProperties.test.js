const { determineAssetProperties } = require('../src/utils/determineProps'); // Corrected path
const { queryAPI } = require('../src/api/queryAPI');

// Mock the queryAPI function
jest.mock('../src/api/queryAPI', () => ({
    queryAPI: jest.fn()
}));

describe('Asset Property Determination Tests', () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });

    // 1. Test for sei1 addresses (CW Tokens)
    test('sei1 address as a natural CW20 asset', async () => {
        const address = 'sei1hrndqntlvtmx2kepr0zsfgr7nzjptcc72cr4ppk4yav58vvy7v3s4er8ed'; // Example CW20 address

        queryAPI.mockResolvedValueOnce({ exists: false }); // No ERC20 pointee
        queryAPI.mockResolvedValueOnce({ exists: false }); // No ERC721 pointee
        queryAPI.mockResolvedValueOnce({ exists: true, pointer: '0xExampleERC20Pointer' }); // CW20 pointer found

        const result = await determineAssetProperties(address);
        expect(result.isBaseAsset).toBe(true);
        expect(result.isPointer).toBe(false);
        expect(result.pointerAddress).toBe('0xExampleERC20Pointer');
        expect(result.pointeeAddress).toBe('');
    });

    // Test for sei1 address as a pointer to ERC20
    test('sei1 address as a pointer to ERC20', async () => {
        const address = 'sei15ulpjml9ddyyupy9sawwc7wnmnzfl44jyg3j43e4vy5cfwgunh8qfhag22'; // Example pointer to ERC20

        queryAPI.mockResolvedValueOnce({ exists: true, pointee: '0x809FF4801aA5bDb33045d1fEC810D082490D63a4' }); // Points to ERC20

        const result = await determineAssetProperties(address);
        expect(result.isBaseAsset).toBe(false);
        expect(result.isPointer).toBe(true);
        expect(result.pointerAddress).toBe('');
        expect(result.pointeeAddress).toBe('0x809FF4801aA5bDb33045d1fEC810D082490D63a4');
    });

    // Test for 0x address as a natural ERC20 asset
    test('0x address as a natural ERC20 asset', async () => {
        const address = '0x809FF4801aA5bDb33045d1fEC810D082490D63a4'; // Example ERC20 asset

        queryAPI.mockResolvedValueOnce({ exists: false }); // No CW20 pointer
        queryAPI.mockResolvedValueOnce({ exists: false }); // No CW721 pointer
        queryAPI.mockResolvedValueOnce({ exists: false }); // No Native pointer
        queryAPI.mockResolvedValueOnce({ exists: true, pointer: 'sei1ExamplePointer' }); // ERC20 pointer found

        const result = await determineAssetProperties(address);
        expect(result.isBaseAsset).toBe(true);
        expect(result.isPointer).toBe(false);
        expect(result.pointerAddress).toBe('sei1ExamplePointer');
        expect(result.pointeeAddress).toBe('');
    });

    // Test for 0x address as a pointer to CW20
    test('0x address as a pointer to CW20', async () => {
        const address = '0x5f0E07dFeE5832Faa00c63F2D33A0D79150E8598'; // Example pointer to CW20

        queryAPI.mockResolvedValueOnce({ exists: true, pointee: 'sei1hrndqntlvtmx2kepr0zsfgr7nzjptcc72cr4ppk4yav58vvy7v3s4er8ed' }); // Points to CW20

        const result = await determineAssetProperties(address);
        expect(result.isBaseAsset).toBe(false);
        expect(result.isPointer).toBe(true);
        expect(result.pointerAddress).toBe('');
        expect(result.pointeeAddress).toBe('sei1hrndqntlvtmx2kepr0zsfgr7nzjptcc72cr4ppk4yav58vvy7v3s4er8ed');
    });

    // Test for factory/ibc address with a pointer
    test('factory address with a pointer', async () => {
        const address = 'factory/sei1e3gttzq5e5k49f9f5gzvrl0rltlav65xu6p9xc0aj7e84lantdjqp7cncc/isei'; // Example factory asset

        queryAPI.mockResolvedValueOnce({ exists: true, pointer: '0x5Cf6826140C1C56Ff49C808A1A75407Cd1DF9423' }); // Has a pointer

        const result = await determineAssetProperties(address);
        expect(result.isBaseAsset).toBe(true);
        expect(result.isPointer).toBe(false);
        expect(result.pointerAddress).toBe('0x5Cf6826140C1C56Ff49C808A1A75407Cd1DF9423');
        expect(result.pointeeAddress).toBe('');
    });

    test('ibc address with a pointer', async () => {
        const address = 'ibc/CA6FBFAF399474A06263E10D0CE5AEBBE15189D6D4B2DD9ADE61007E68EB9DB0'; // Example IBC asset

        queryAPI.mockResolvedValueOnce({ exists: true, pointer: '0xExampleNativePointer' }); // Has a pointer

        const result = await determineAssetProperties(address);
        expect(result.isBaseAsset).toBe(true);
        expect(result.isPointer).toBe(false);
        expect(result.pointerAddress).toBe('0xExampleNativePointer');
        expect(result.pointeeAddress).toBe('');
    });
});
