/**
 * Unit tests for asset property determination logic
 */
import { determineAssetProperties } from '../src/utils/determineProps.js';
import * as apiModule from '../src/api/queryAPI.js';

// Create a reference to the original implementation
const originalQueryAPI = apiModule.queryAPI;

// Mock responses collection
const mockResponses = {};

// Create a mock implementation of queryAPI
const mockQueryAPI = async function(endpoint, params) {
    // Record this call for later inspection
    mockQueryCalls.push({ endpoint, params });
    
    // Look for a matching mock response
    const key = `${endpoint}|${JSON.stringify(params)}`;
    
    if (mockResponses[key]) {
        return Promise.resolve(mockResponses[key]);
    }
    
    // Log that we didn't find a matching mock
    console.warn(`No mock response for: ${key}`);
    return Promise.resolve(null);
};

// Track calls to the mock function
let mockQueryCalls = [];

// Setup the test environment with mocks
function setupTestEnvironment() {
    // Replace the real queryAPI with our mock using monkey patching
    // This is ESM-compatible as we're not reassigning the imported binding
    apiModule.queryAPI = mockQueryAPI;
    
    // Clear tracking data
    mockQueryCalls = [];
    
    // Setup mock responses
    mockResponses['/sei-protocol/seichain/evm/pointee|{"pointerType":0,"pointer":"sei1hrndqntlvtmx2kepr0zsfgr7nzjptcc72cr4ppk4yav58vvy7v3s4er8ed"}'] = { exists: false };
    mockResponses['/sei-protocol/seichain/evm/pointee|{"pointerType":1,"pointer":"sei1hrndqntlvtmx2kepr0zsfgr7nzjptcc72cr4ppk4yav58vvy7v3s4er8ed"}'] = { exists: false };
    mockResponses['/sei-protocol/seichain/evm/pointee|{"pointerType":5,"pointer":"sei1hrndqntlvtmx2kepr0zsfgr7nzjptcc72cr4ppk4yav58vvy7v3s4er8ed"}'] = { exists: false };
    mockResponses['/sei-protocol/seichain/evm/pointer|{"pointerType":3,"pointee":"sei1hrndqntlvtmx2kepr0zsfgr7nzjptcc72cr4ppk4yav58vvy7v3s4er8ed"}'] = { 
        pointer: "0x5f0E07dFeE5832Faa00c63F2D33A0D79150E8598", 
        version: 2, 
        exists: true 
    };
    
    // Mock for CW1155 checks (added for completeness)
    mockResponses['/sei-protocol/seichain/evm/pointee|{"pointerType":6,"pointer":"sei1hrndqntlvtmx2kepr0zsfgr7nzjptcc72cr4ppk4yav58vvy7v3s4er8ed"}'] = { exists: false };
    mockResponses['/sei-protocol/seichain/evm/pointer|{"pointerType":6,"pointee":"sei1hrndqntlvtmx2kepr0zsfgr7nzjptcc72cr4ppk4yav58vvy7v3s4er8ed"}'] = { exists: false };
    
    // Mock for EVM address as pointer to CW20
    mockResponses['/sei-protocol/seichain/evm/pointee|{"pointerType":3,"pointer":"0x5f0E07dFeE5832Faa00c63F2D33A0D79150E8598"}'] = { 
        pointee: "sei1hrndqntlvtmx2kepr0zsfgr7nzjptcc72cr4ppk4yav58vvy7v3s4er8ed", 
        version: 2, 
        exists: true 
    };
    mockResponses['/sei-protocol/seichain/evm/pointee|{"pointerType":4,"pointer":"0x5f0E07dFeE5832Faa00c63F2D33A0D79150E8598"}'] = { exists: false };
    mockResponses['/sei-protocol/seichain/evm/pointee|{"pointerType":2,"pointer":"0x5f0E07dFeE5832Faa00c63F2D33A0D79150E8598"}'] = { exists: false };
    mockResponses['/sei-protocol/seichain/evm/pointee|{"pointerType":6,"pointer":"0x5f0E07dFeE5832Faa00c63F2D33A0D79150E8598"}'] = { exists: false };
    
    // Mock for NATIVE asset with EVM pointer
    mockResponses['/sei-protocol/seichain/evm/pointer|{"pointerType":2,"pointee":"ibc/CA6FBFAF399474A06263E10D0CE5AEBBE15189D6D4B2DD9ADE61007E68EB9DB0"}'] = { 
        pointer: "0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1", 
        version: 1000, 
        exists: true 
    };
    
    // Mock for EVM address as base with CW pointer
    mockResponses['/sei-protocol/seichain/evm/pointee|{"pointerType":3,"pointer":"0x809FF4801aA5bDb33045d1fEC810D082490D63a4"}'] = { exists: false };
    mockResponses['/sei-protocol/seichain/evm/pointee|{"pointerType":4,"pointer":"0x809FF4801aA5bDb33045d1fEC810D082490D63a4"}'] = { exists: false };
    mockResponses['/sei-protocol/seichain/evm/pointee|{"pointerType":6,"pointer":"0x809FF4801aA5bDb33045d1fEC810D082490D63a4"}'] = { exists: false };
    mockResponses['/sei-protocol/seichain/evm/pointee|{"pointerType":2,"pointer":"0x809FF4801aA5bDb33045d1fEC810D082490D63a4"}'] = { exists: false };
    mockResponses['/sei-protocol/seichain/evm/pointer|{"pointerType":0,"pointee":"0x809FF4801aA5bDb33045d1fEC810D082490D63a4"}'] = { 
        pointer: "sei1msjly0e2v5u99z53vqre47ltv0fsfa6h9fzrljuvp0e5zg76x7fswxcxjl", 
        version: 1, 
        exists: true 
    };
    
    // Mock for CW address as pointer to EVM
    mockResponses['/sei-protocol/seichain/evm/pointee|{"pointerType":0,"pointer":"sei1msjly0e2v5u99z53vqre47ltv0fsfa6h9fzrljuvp0e5zg76x7fswxcxjl"}'] = { 
        pointee: "0x809FF4801aA5bDb33045d1fEC810D082490D63a4", 
        version: 1, 
        exists: true 
    };
    mockResponses['/sei-protocol/seichain/evm/pointee|{"pointerType":1,"pointer":"sei1msjly0e2v5u99z53vqre47ltv0fsfa6h9fzrljuvp0e5zg76x7fswxcxjl"}'] = { exists: false };
    mockResponses['/sei-protocol/seichain/evm/pointee|{"pointerType":5,"pointer":"sei1msjly0e2v5u99z53vqre47ltv0fsfa6h9fzrljuvp0e5zg76x7fswxcxjl"}'] = { exists: false };
}

// Restore the original environment
function restoreEnvironment() {
    // ESM compatible way to restore the original function
    apiModule.queryAPI = originalQueryAPI;
}

// Test runner function
async function runTests() {
    console.log("Running Asset Properties Tests...");
    
    setupTestEnvironment();
    
    // Test cases
    const testCases = [
        {
            name: "CW20 asset as base with ERC20 pointer",
            address: "sei1hrndqntlvtmx2kepr0zsfgr7nzjptcc72cr4ppk4yav58vvy7v3s4er8ed",
            expected: {
                isBaseAsset: true,
                isPointer: false,
                pointerType: "CW20",
                pointerAddress: "0x5f0E07dFeE5832Faa00c63F2D33A0D79150E8598",
                pointeeAddress: ""
            }
        },
        {
            name: "EVM address as pointer to CW20",
            address: "0x5f0E07dFeE5832Faa00c63F2D33A0D79150E8598",
            expected: {
                isBaseAsset: false,
                isPointer: true,
                pointerType: "CW20",
                pointerAddress: "",
                pointeeAddress: "sei1hrndqntlvtmx2kepr0zsfgr7nzjptcc72cr4ppk4yav58vvy7v3s4er8ed"
            }
        },
        {
            name: "NATIVE asset with EVM pointer",
            address: "ibc/CA6FBFAF399474A06263E10D0CE5AEBBE15189D6D4B2DD9ADE61007E68EB9DB0",
            expected: {
                isBaseAsset: true,
                isPointer: false,
                pointerType: "NATIVE",
                pointerAddress: "0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1",
                pointeeAddress: ""
            }
        },
        {
            name: "EVM address as base with CW pointer",
            address: "0x809FF4801aA5bDb33045d1fEC810D082490D63a4",
            expected: {
                isBaseAsset: true,
                isPointer: false,
                pointerType: "ERC20",
                pointerAddress: "sei1msjly0e2v5u99z53vqre47ltv0fsfa6h9fzrljuvp0e5zg76x7fswxcxjl",
                pointeeAddress: ""
            }
        },
        {
            name: "CW address as pointer to EVM",
            address: "sei1msjly0e2v5u99z53vqre47ltv0fsfa6h9fzrljuvp0e5zg76x7fswxcxjl",
            expected: {
                isBaseAsset: false,
                isPointer: true,
                pointerType: "ERC20",
                pointerAddress: "",
                pointeeAddress: "0x809FF4801aA5bDb33045d1fEC810D082490D63a4"
            }
        }
    ];
    
    // Run each test case
    let passed = 0;
    let failed = 0;
    
    for (const testCase of testCases) {
        try {
            console.log(`\nTesting: ${testCase.name}`);
            
            // Reset the call tracking for each test
            mockQueryCalls = [];
            
            // Call the function
            const result = await determineAssetProperties(testCase.address);
            
            // Check if result matches expected values for key properties
            const success = (
                result.isBaseAsset === testCase.expected.isBaseAsset &&
                result.isPointer === testCase.expected.isPointer &&
                result.pointerType === testCase.expected.pointerType &&
                result.pointerAddress === testCase.expected.pointerAddress &&
                result.pointeeAddress === testCase.expected.pointeeAddress
            );
            
            if (success) {
                console.log(`PASSED: ${testCase.name}`);
                passed++;
            } else {
                console.log(`FAILED: ${testCase.name}`);
                console.log("Expected:", testCase.expected);
                console.log("Got:", result);
                failed++;
            }
            
            // Log API calls for debugging
            console.log(`API calls made: ${mockQueryCalls.length}`);
        } catch (error) {
            console.error(`ERROR in test "${testCase.name}":`, error);
            failed++;
        }
    }
    
    // Print summary
    console.log("\nTest Summary:");
    console.log(`Total: ${testCases.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    
    // Restore original environment
    restoreEnvironment();
    
    // Return success or failure
    return failed === 0;
}

// Execute tests
runTests()
    .then(success => {
        if (!success) {
            process.exit(1);
        }
    })
    .catch(error => {
        console.error("Unhandled error in tests:", error);
        process.exit(1);
    });