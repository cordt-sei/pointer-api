/**
 * Real API query tests for known addresses
 */
import { determineAssetProperties } from '../src/utils/determineProps.js';

// Define known constants
const testCases = [
  {
    description: "Natural ERC20 with known pointer",
    address: '0x809FF4801aA5bDb33045d1fEC810D082490D63a4',
    expectedProps: {
      isBaseAsset: true,
      isPointer: false,
      pointerType: 'ERC20'
    }
  },
  {
    description: "Known pointer for a natural ERC20",
    address: 'sei1msjly0e2v5u99z53vqre47ltv0fsfa6h9fzrljuvp0e5zg76x7fswxcxjl',
    expectedProps: {
      isBaseAsset: false,
      isPointer: true,
      pointerType: 'ERC20'
    }
  },
  {
    description: "Natural CW20 with known pointer",
    address: 'sei1hrndqntlvtmx2kepr0zsfgr7nzjptcc72cr4ppk4yav58vvy7v3s4er8ed',
    expectedProps: {
      isBaseAsset: true,
      isPointer: false,
      pointerType: 'CW20'
    }
  },
  {
    description: "IBC token with known pointer",
    address: 'ibc/CA6FBFAF399474A06263E10D0CE5AEBBE15189D6D4B2DD9ADE61007E68EB9DB0',
    expectedProps: {
      isBaseAsset: true,
      isPointer: false,
      pointerType: 'NATIVE'
    }
  }
];

// Run tests
async function runTests() {
  console.log("Running Real Query Tests with actual API...");
  let passed = 0;
  let failed = 0;
  
  for (const testCase of testCases) {
    try {
      console.log(`\nTesting: ${testCase.description}`);
      console.log(`Address: ${testCase.address}`);
      
      // Call the determineAssetProperties function
      const result = await determineAssetProperties(testCase.address);
      
      // Check only the core expected properties
      const success = Object.keys(testCase.expectedProps).every(key => 
        result[key] === testCase.expectedProps[key]
      );
      
      // Log results
      console.log("Result:", JSON.stringify(result, null, 2));
      
      if (success) {
        console.log(`PASSED: ${testCase.description}`);
        passed++;
      } else {
        console.log(`FAILED: ${testCase.description}`);
        console.log("Expected properties:", testCase.expectedProps);
        console.log("Got:", {
          isBaseAsset: result.isBaseAsset,
          isPointer: result.isPointer,
          pointerType: result.pointerType
        });
        failed++;
      }
    } catch (error) {
      console.error(`ERROR in test "${testCase.description}":`, error);
      failed++;
    }
    
    console.log('------------------------------------------');
  }
  
  // Print summary
  console.log("\nTest Summary:");
  console.log(`Total: ${testCases.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  
  // Return success or failure
  return failed === 0;
}

// Execute the tests
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