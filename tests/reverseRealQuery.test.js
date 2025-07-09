/**
 * Reverse direction real API query tests
 * Tests the relationship between known pairs of addresses
 */
import { determineAssetProperties } from '../src/utils/determineProps.js';

// Define reverse test cases
const reverseTestCases = [
  {
    description: "Pair test: EVM base asset and its CW pointer",
    addresses: [
      '0x809FF4801aA5bDb33045d1fEC810D082490D63a4',
      'sei15ulpjml9ddyyupy9sawwc7wnmnzfl44jyg3j43e4vy5cfwgunh8qfhag22'
    ],
    relation: 'pointer-pointee'
  },
  {
    description: "Pair test: CW base asset and its EVM pointer",
    addresses: [
      'sei1hrndqntlvtmx2kepr0zsfgr7nzjptcc72cr4ppk4yav58vvy7v3s4er8ed',
      '0x5f0E07dFeE5832Faa00c63F2D33A0D79150E8598'
    ],
    relation: 'pointer-pointee'
  },
  {
    description: "Pair test: IBC token and its EVM pointer",
    addresses: [
      'ibc/CA6FBFAF399474A06263E10D0CE5AEBBE15189D6D4B2DD9ADE61007E68EB9DB0',
      '0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1'
    ],
    relation: 'pointer-pointee'
  }
];

// Validate the relationship between two addresses
function validateRelationship(addr1Result, addr2Result) {
  // Check if addr1 is the base asset and addr2 is the pointer
  if (
    addr1Result.isBaseAsset && !addr1Result.isPointer &&
    !addr2Result.isBaseAsset && addr2Result.isPointer
  ) {
    return addr1Result.pointerAddress === addr2Result.address &&
           addr2Result.pointeeAddress === addr1Result.address;
  }
  
  // Check if addr2 is the base asset and addr1 is the pointer
  if (
    addr2Result.isBaseAsset && !addr2Result.isPointer &&
    !addr1Result.isBaseAsset && addr1Result.isPointer
  ) {
    return addr2Result.pointerAddress === addr1Result.address &&
           addr1Result.pointeeAddress === addr2Result.address;
  }
  
  return false;
}

// Run tests
async function runTests() {
  console.log("Running Reverse Relationship Tests with actual API...");
  let passed = 0;
  let failed = 0;
  
  for (const testCase of reverseTestCases) {
    try {
      console.log(`\nTesting: ${testCase.description}`);
      console.log(`Addresses: ${testCase.addresses[0]} and ${testCase.addresses[1]}`);
      
      // Process both addresses
      const result1 = await determineAssetProperties(testCase.addresses[0]);
      const result2 = await determineAssetProperties(testCase.addresses[1]);
      
      console.log(`\nFirst address result: ${JSON.stringify(result1, null, 2)}`);
      console.log(`Second address result: ${JSON.stringify(result2, null, 2)}`);
      
      // Validate the expected relationship
      const relationship = validateRelationship(result1, result2);
      
      if (relationship) {
        console.log(`PASSED: Relationship validation successful`);
        passed++;
      } else {
        console.log(`FAILED: Expected ${testCase.relation} relationship not found`);
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
  console.log(`Total: ${reverseTestCases.length}`);
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
