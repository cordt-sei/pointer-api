/**
 * Unit tests for IBC denom regex patterns and URL rewriting logic
 */

// Test result tracking
let totalTests = 0;
let passedTests = 0;
const testResults = [];

// Helper function to run a test
function test(description, testFn) {
	totalTests++;
	try {
		testFn();
		passedTests++;
		testResults.push({ description, passed: true });
	} catch (error) {
		testResults.push({ description, passed: false, error: error.message });
	}
}

// Helper function to assert expectations
function expect(actual) {
	return {
		toBe(expected) {
			if (actual !== expected) {
				throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
			}
		},
		toBeTruthy() {
			if (!actual) {
				throw new Error(`Expected truthy value but got ${JSON.stringify(actual)}`);
			}
		},
		toBeFalsy() {
			if (actual) {
				throw new Error(`Expected falsy value but got ${JSON.stringify(actual)}`);
			}
		}
	};
}

function runIbcRegexTests() {
	console.log('\nRunning IBC Denom Regex Pattern Tests...\n');
	
	// The regex pattern from Caddyfile: ^/ibc/([^/]+)$
	const ibcRegexPattern = /^\/ibc\/([^\/]+)$/;
	
	// Standard IBC Denom Tests
	console.log('Standard IBC Denom Tests:');
	
	test('should match standard IBC denom with 64-character hash', () => {
		const path = '/ibc/CA6FBFAF399474A06263E10D0CE5AEBBE15189D6D4B2DD9ADE61007E68EB9DB0';
		const match = path.match(ibcRegexPattern);
		
		expect(match).toBeTruthy();
		expect(match[1]).toBe('CA6FBFAF399474A06263E10D0CE5AEBBE15189D6D4B2DD9ADE61007E68EB9DB0');
	});
	
	test('should capture the full hash regardless of length', () => {
		// Test various hash lengths
		const testCases = [
			{ path: '/ibc/ABC123', expectedHash: 'ABC123' },
			{ path: '/ibc/1234567890ABCDEF', expectedHash: '1234567890ABCDEF' },
			{ path: '/ibc/' + 'A'.repeat(32), expectedHash: 'A'.repeat(32) },
			{ path: '/ibc/' + 'B'.repeat(64), expectedHash: 'B'.repeat(64) },
			{ path: '/ibc/' + 'C'.repeat(128), expectedHash: 'C'.repeat(128) },
		];
		
		testCases.forEach(({ path, expectedHash }) => {
			const match = path.match(ibcRegexPattern);
			expect(match).toBeTruthy();
			expect(match[1]).toBe(expectedHash);
		});
	});
	
	test('should match IBC denoms with mixed case characters', () => {
		const testCases = [
			'/ibc/abcdef123456',
			'/ibc/ABCDEF123456',
			'/ibc/AbCdEf123456',
			'/ibc/aBcDeF123456'
		];
		
		testCases.forEach(path => {
			const match = path.match(ibcRegexPattern);
			expect(match).toBeTruthy();
			expect(match[1]).toBe(path.substring(5)); // Remove '/ibc/' prefix
		});
	});
	
	test('should match IBC denoms with numbers and letters', () => {
		const path = '/ibc/0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
		const match = path.match(ibcRegexPattern);
		
		expect(match).toBeTruthy();
		expect(match[1]).toBe('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ');
	});
	
	// Edge Cases
	console.log('\nEdge Cases:');
	
	test('should not match paths with additional slashes', () => {
		const testCases = [
			'/ibc/ABC123/extra',
			'/ibc/ABC123/',
			'/ibc/ABC/123',
			'/ibc/ABC/123/456'
		];
		
		testCases.forEach(path => {
			const match = path.match(ibcRegexPattern);
			expect(match).toBeFalsy();
		});
	});
	
	test('should not match paths without /ibc/ prefix', () => {
		const testCases = [
			'ibc/ABC123',
			'/ABC123',
			'/ibcABC123',
			'ABC123'
		];
		
		testCases.forEach(path => {
			const match = path.match(ibcRegexPattern);
			expect(match).toBeFalsy();
		});
	});
	
	test('should not match empty hash', () => {
		const path = '/ibc/';
		const match = path.match(ibcRegexPattern);
		expect(match).toBeFalsy();
	});
	
	test('should match IBC denoms with special characters that are not slashes', () => {
		const testCases = [
			{ path: '/ibc/ABC-123', expectedHash: 'ABC-123' },
			{ path: '/ibc/ABC_123', expectedHash: 'ABC_123' },
			{ path: '/ibc/ABC.123', expectedHash: 'ABC.123' },
			{ path: '/ibc/ABC+123', expectedHash: 'ABC+123' },
			{ path: '/ibc/ABC=123', expectedHash: 'ABC=123' },
			{ path: '/ibc/ABC%123', expectedHash: 'ABC%123' }
		];
		
		testCases.forEach(({ path, expectedHash }) => {
			const match = path.match(ibcRegexPattern);
			expect(match).toBeTruthy();
			expect(match[1]).toBe(expectedHash);
		});
	});
	
	// URL Encoding/Rewriting Logic
	console.log('\nURL Encoding/Rewriting Logic:');
	
	// Simulate Caddy's rewrite behavior
	const simulateCaddyRewrite = (path) => {
		const match = path.match(ibcRegexPattern);
		if (match) {
			// Caddy rewrite: /ibc%2F{re.ibcPath.1}
			return `/ibc%2F${match[1]}`;
		}
		return path;
	};
	
	test('should correctly rewrite standard IBC paths', () => {
		const path = '/ibc/CA6FBFAF399474A06263E10D0CE5AEBBE15189D6D4B2DD9ADE61007E68EB9DB0';
		const rewritten = simulateCaddyRewrite(path);
		
		expect(rewritten).toBe('/ibc%2FCA6FBFAF399474A06263E10D0CE5AEBBE15189D6D4B2DD9ADE61007E68EB9DB0');
	});
	
	test('should preserve the full hash during rewriting', () => {
		const testCases = [
			{
				original: '/ibc/ABC123',
				expected: '/ibc%2FABC123'
			},
			{
				original: '/ibc/1234567890ABCDEF1234567890ABCDEF',
				expected: '/ibc%2F1234567890ABCDEF1234567890ABCDEF'
			},
			{
				original: '/ibc/HASH_WITH-SPECIAL.CHARS+123',
				expected: '/ibc%2FHASH_WITH-SPECIAL.CHARS+123'
			}
		];
		
		testCases.forEach(({ original, expected }) => {
			const rewritten = simulateCaddyRewrite(original);
			expect(rewritten).toBe(expected);
		});
	});
	
	test('should not rewrite non-matching paths', () => {
		const testCases = [
			'/ibc/ABC/123',
			'/factory/sei1/token',
			'/some/other/path',
			'/ibcABC123'
		];
		
		testCases.forEach(path => {
			const rewritten = simulateCaddyRewrite(path);
			expect(rewritten).toBe(path); // Should remain unchanged
		});
	});
	
	test('URL encoding should handle special characters correctly', () => {
		// Test that %2F is the correct encoding for forward slash
		expect(encodeURIComponent('/')).toBe('%2F');
		
		// Test full encoded path
		const originalPath = 'ibc/ABC123';
		const encodedPath = `ibc${encodeURIComponent('/')}ABC123`;
		expect(encodedPath).toBe('ibc%2FABC123');
	});
	
	// Integration with API Validation
	console.log('\nIntegration with API Validation:');
	
	// Test the validation logic from server.js
	const isValidAddress = (address) => {
		const validPrefixes = ['0x', 'sei1', 'ibc/', 'factory/'];
		const hasValidPrefix = validPrefixes.some(prefix => address.startsWith(prefix));
		const hasInvalidChars = /[^a-zA-Z0-9_\-\/]/.test(address);
		
		return hasValidPrefix && !hasInvalidChars;
	};
	
	test('should validate IBC addresses correctly', () => {
		const validAddresses = [
			'ibc/CA6FBFAF399474A06263E10D0CE5AEBBE15189D6D4B2DD9ADE61007E68EB9DB0',
			'ibc/ABC123',
			'ibc/123456789ABCDEF',
			'ibc/TEST_HASH-123'
		];
		
		validAddresses.forEach(address => {
			expect(isValidAddress(address)).toBe(true);
		});
	});
	
	test('should reject invalid IBC addresses', () => {
		const invalidAddresses = [
			'ibc/ABC@123', // Invalid character @
			'ibc/ABC#123', // Invalid character #
			'ibc/ABC$123', // Invalid character $
			'ibc/ABC!123', // Invalid character !
			'IBC/ABC123',  // Wrong case for prefix
			'/ibc/ABC123', // Leading slash
		];
		
		invalidAddresses.forEach(address => {
			expect(isValidAddress(address)).toBe(false);
		});
	});
	
	// Factory Denom Regex Pattern Tests
	console.log('\nFactory Denom Regex Pattern Tests:');
	
	// The regex pattern from Caddyfile: ^/factory/([^/]+)/([^/]+)$
	const factoryRegexPattern = /^\/factory\/([^\/]+)\/([^\/]+)$/;
	
	test('should match factory paths with two segments', () => {
		const path = '/factory/sei1abcdef/token123';
		const match = path.match(factoryRegexPattern);
		
		expect(match).toBeTruthy();
		expect(match[1]).toBe('sei1abcdef');
		expect(match[2]).toBe('token123');
	});
	
	test('should correctly rewrite factory paths', () => {
		const path = '/factory/sei1abcdef/token123';
		const match = path.match(factoryRegexPattern);
		
		if (match) {
			const rewritten = `/factory%2F${match[1]}%2F${match[2]}`;
			expect(rewritten).toBe('/factory%2Fsei1abcdef%2Ftoken123');
		}
	});
}

// Run tests and display results
runIbcRegexTests();

// Display summary
console.log('\n' + '='.repeat(50));
console.log(`Total tests: ${totalTests}`);
console.log(`Passed: ${passedTests}`);
console.log(`Failed: ${totalTests - passedTests}`);

// Display failed tests if any
if (totalTests > passedTests) {
	console.log('\nFailed tests:');
	testResults.filter(r => !r.passed).forEach(r => {
		console.log(`  ❌ ${r.description}`);
		console.log(`     Error: ${r.error}`);
	});
	process.exit(1);
} else {
	console.log('\n✅ All tests passed!');
	process.exit(0);
}