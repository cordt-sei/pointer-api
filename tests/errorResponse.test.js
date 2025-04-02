/**
 * Test error handling for the determineAssetProperties function
 * This test specifically tests how the system handles API errors
 */
import { determineAssetProperties } from '../src/utils/determineProps.js';
import * as apiModule from '../src/api/queryAPI.js';

// Store original queryAPI function
const originalQueryAPI = apiModule.queryAPI;

// Define different types of errors for testing
const ERROR_TYPES = {
  NULL_RESPONSE: 'null-response',
  API_TIMEOUT: 'api-timeout',
  RATE_LIMIT: 'rate-limit',
  SERVER_ERROR: 'server-error',
  BAD_REQUEST: 'bad-request'
};

// Store original console methods to restore later
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn
};

// Custom logging function that collects logs
let logs = [];
function collectLog(level, ...args) {
  logs.push({ level, args });
  // Still call original method for visibility during testing
  originalConsole[level](...args);
}

// Modify the queryAPI function for error testing
function mockQueryAPIWithErrors(errorType, affectAllCalls = false) {
  let callCount = 0;
  
  // Create a mock implementation that generates errors
  apiModule.queryAPI = async function(endpoint, params) {
    callCount++;
    
    // If not affecting all calls and not the second call, return normal null response
    if (!affectAllCalls && callCount !== 2) {
      return Promise.resolve(null);
    }
    
    switch (errorType) {
      case ERROR_TYPES.NULL_RESPONSE:
        return Promise.resolve(null);
        
      case ERROR_TYPES.API_TIMEOUT:
        return Promise.reject(new Error('Request timeout'));
        
      case ERROR_TYPES.RATE_LIMIT:
        const rateLimitError = new Error('Rate limit exceeded');
        rateLimitError.response = { status: 429, data: { error: 'Too many requests' } };
        return Promise.reject(rateLimitError);
        
      case ERROR_TYPES.SERVER_ERROR:
        const serverError = new Error('Internal server error');
        serverError.response = { status: 500, data: { error: 'Server error' } };
        return Promise.reject(serverError);
        
      case ERROR_TYPES.BAD_REQUEST:
        const badRequestError = new Error('Bad request');
        badRequestError.response = { status: 400, data: { error: 'Invalid parameters' } };
        return Promise.reject(badRequestError);
        
      default:
        return Promise.resolve(null);
    }
  };
}

// Restore the original queryAPI function
function restoreQueryAPI() {
  apiModule.queryAPI = originalQueryAPI;
}

// Test execution
async function runTests() {
  console.log("Running Error Response Tests...");
  let passed = 0;
  let failed = 0;
  
  const testAddress = '0x809FF4801aA5bDb33045d1fEC810D082490D63a4';
  
  // Setup logging interception
  console.log = (...args) => collectLog('log', ...args);
  console.error = (...args) => collectLog('error', ...args);
  console.warn = (...args) => collectLog('warn', ...args);
  
  const testCases = [
    {
      name: "Handles all null responses",
      errorType: ERROR_TYPES.NULL_RESPONSE,
      affectAllCalls: true,
      validation: (result) => {
        // Should still return a result with default values
        return result && !result.error;
      }
    },
    {
      name: "Handles API timeout",
      errorType: ERROR_TYPES.API_TIMEOUT,
      validation: (result) => {
        // Should still return a result without error
        return result && !result.error;
      }
    },
    {
      name: "Handles rate limiting errors",
      errorType: ERROR_TYPES.RATE_LIMIT,
      validation: (result) => {
        // Should still return a result without error
        return result && !result.error;
      }
    },
    {
      name: "Handles server errors",
      errorType: ERROR_TYPES.SERVER_ERROR,
      validation: (result) => {
        // Should still return a result without error
        return result && !result.error;
      }
    },
    {
      name: "Handles invalid address",
      address: "invalid-address",
      validation: (result) => {
        // Should identify unknown address type
        return result && !result.error && result.pointerType === 'UNKNOWN';
      }
    }
  ];
  
  for (const testCase of testCases) {
    try {
      console.log(`\nTesting: ${testCase.name}`);
      
      // Reset logs
      logs = [];
      
      // Setup mock if needed
      if (testCase.errorType) {
        mockQueryAPIWithErrors(testCase.errorType, testCase.affectAllCalls);
      }
      
      // Process the address
      const address = testCase.address || testAddress;
      const result = await determineAssetProperties(address);
      
      console.log("Result:", result);
      
      // Validate based on test case
      const success = testCase.validation(result);
      
      if (success) {
        console.log(`PASSED: ${testCase.name}`);
        passed++;
      } else {
        console.log(`FAILED: ${testCase.name}`);
        console.log("Expected validation to pass but it failed");
        failed++;
      }
      
      // Check logs for specific error patterns
      if (testCase.errorType) {
        const hasErrorLog = logs.some(log => 
          log.level === 'error' && 
          (log.args[0].includes('Error') || log.args[0].includes('error'))
        );
        
        if (!hasErrorLog) {
          console.log(`ISSUE: No error logs found for error test "${testCase.name}"`);
        }
      }
      
      // Restore normal API function
      restoreQueryAPI();
      
    } catch (error) {
      console.error(`ERROR in test "${testCase.name}":`, error);
      failed++;
      
      // Restore normal API function
      restoreQueryAPI();
    }
  }
  
  // Restore original console methods
  console.log = originalConsole.log;
  console.error = originalConsole.error;
  console.warn = originalConsole.warn;
  
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