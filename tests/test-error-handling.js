/**
 * Test script for error handling in the Sei Pointer API
 * 
 * This script uses Jest and Axios Mock Adapter to test:
 * - Rate limiting errors (429)
 * - Authentication errors (403)
 * - General API errors (500)
 * - Timeout handling
 */

const axios = require('axios');
const MockAdapter = require('axios-mock-adapter');
const { queryAPI } = require('./src/api/queryAPI');

// Create a new instance of the axios mock adapter
const mock = new MockAdapter(axios);

// Test setup
beforeEach(() => {
    // Reset the mock adapter before each test
    mock.reset();
    
    // Clear all console output mocks
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
});

// Test teardown
afterEach(() => {
    // Restore console mocks
    console.error.mockRestore();
    console.warn.mockRestore();
    console.log.mockRestore();
});

describe('queryAPI Error Handling', () => {
    const testEndpoint = '/sei-protocol/seichain/evm/pointer';
    const testParams = { pointerType: 0, pointee: '0x123' };
    
    test('should handle 429 rate limit errors', async () => {
        // Mock a 429 rate limit error
        mock.onGet().reply(429, { error: 'Rate limit exceeded' });
        
        const result = await queryAPI(testEndpoint, testParams);
        
        // Verify the function returns null on error
        expect(result).toBeNull();
        
        // Verify the error was logged
        expect(console.error).toHaveBeenCalled();
        expect(console.error.mock.calls[0][0]).toContain('Error querying API');
        expect(console.error.mock.calls[1][0]).toContain('API Rate Limit Exceeded');
    });
    
    test('should handle 403 authentication errors', async () => {
        // Mock a 403 authentication error
        mock.onGet().reply(403, { error: 'Forbidden - Invalid API key' });
        
        const result = await queryAPI(testEndpoint, testParams);
        
        // Verify the function returns null on error
        expect(result).toBeNull();
        
        // Verify the error was logged
        expect(console.error).toHaveBeenCalled();
        expect(console.error.mock.calls[0][0]).toContain('Error querying API');
    });
    
    test('should handle timeout errors', async () => {
        // Mock a timeout by not responding to the request
        mock.onGet().timeout();
        
        const result = await queryAPI(testEndpoint, testParams);
        
        // Verify the function returns null on error
        expect(result).toBeNull();
        
        // Verify the error was logged
        expect(console.error).toHaveBeenCalled();
    });
    
    test('should handle general API errors', async () => {
        // Mock a 500 internal server error
        mock.onGet().reply(500, { error: 'Internal Server Error' });
        
        const result = await queryAPI(testEndpoint, testParams);
        
        // Verify the function returns null on error
        expect(result).toBeNull();
        
        // Verify the error was logged
        expect(console.error).toHaveBeenCalled();
    });
    
    test('should handle successful API responses', async () => {
        // Mock a successful response
        const mockResponse = { exists: true, pointer: '0xabc' };
        mock.onGet().reply(200, mockResponse);
        
        const result = await queryAPI(testEndpoint, testParams);
        
        // Verify the function returns the response data on success
        expect(result).toEqual(mockResponse);
        
        // Verify no errors were logged
        expect(console.error).not.toHaveBeenCalled();
    });
});

// Optional: If you're not using Jest, you can run the tests manually
if (require.main === module) {
    console.log('Running tests manually...');
    const testCases = [
        {
            name: 'Rate Limit Error',
            setup: () => mock.onGet().reply(429, { error: 'Rate limit exceeded' })
        },
        {
            name: 'Authentication Error',
            setup: () => mock.onGet().reply(403, { error: 'Forbidden - Invalid API key' })
        },
        {
            name: 'Timeout Error',
            setup: () => mock.onGet().timeout()
        },
        {
            name: 'Server Error',
            setup: () => mock.onGet().reply(500, { error: 'Internal Server Error' })
        },
        {
            name: 'Success Response',
            setup: () => mock.onGet().reply(200, { exists: true, pointer: '0xabc' })
        }
    ];
    
    (async () => {
        for (const test of testCases) {
            console.log(`\nTesting: ${test.name}`);
            mock.reset();
            test.setup();
            
            try {
                const result = await queryAPI('/test-endpoint', { test: true });
                console.log('Result:', result);
            } catch (error) {
                console.error('Test failed:', error);
            }
        }
        
        // Cleanup
        mock.restore();
    })();
}
