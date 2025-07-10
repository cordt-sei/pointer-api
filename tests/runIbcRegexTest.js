#!/usr/bin/env node

// Standalone test runner for IBC regex patterns
// Can be run directly with: node tests/runIbcRegexTest.js

const ibcRegexPattern = /^\/ibc\/([^\/]+)$/;
const factoryRegexPattern = /^\/factory\/([^\/]+)\/([^\/]+)$/;

// Color codes for output
const colors = {
	green: '\x1b[32m',
	red: '\x1b[31m',
	yellow: '\x1b[33m',
	blue: '\x1b[34m',
	reset: '\x1b[0m'
};

function testIbcPattern(path, shouldMatch, expectedCapture) {
	const match = path.match(ibcRegexPattern);
	const passed = shouldMatch ? (match && match[1] === expectedCapture) : !match;
	
	console.log(
		`${passed ? colors.green + '✓' : colors.red + '✗'} ${colors.reset}` +
		`Testing: "${path}" - ` +
		`${shouldMatch ? `Expected capture: "${expectedCapture}"` : 'Should not match'} - ` +
		`${match ? `Got: "${match[1]}"` : 'No match'}`
	);
	
	return passed;
}

function simulateCaddyRewrite(path) {
	const ibcMatch = path.match(ibcRegexPattern);
	if (ibcMatch) {
		return `/ibc%2F${ibcMatch[1]}`;
	}
	
	const factoryMatch = path.match(factoryRegexPattern);
	if (factoryMatch) {
		return `/factory%2F${factoryMatch[1]}%2F${factoryMatch[2]}`;
	}
	
	return path;
}

console.log(colors.blue + '\n=== IBC Denom Regex Pattern Tests ===' + colors.reset);
console.log('Pattern: ^/ibc/([^/]+)$\n');

let totalTests = 0;
let passedTests = 0;

// Standard IBC denoms
console.log(colors.yellow + 'Standard IBC Denoms:' + colors.reset);
const standardTests = [
	['/ibc/CA6FBFAF399474A06263E10D0CE5AEBBE15189D6D4B2DD9ADE61007E68EB9DB0', true, 'CA6FBFAF399474A06263E10D0CE5AEBBE15189D6D4B2DD9ADE61007E68EB9DB0'],
	['/ibc/ABC123', true, 'ABC123'],
	['/ibc/1234567890ABCDEF', true, '1234567890ABCDEF'],
	['/ibc/' + 'A'.repeat(32), true, 'A'.repeat(32)],
	['/ibc/' + 'B'.repeat(64), true, 'B'.repeat(64)],
	['/ibc/' + 'C'.repeat(128), true, 'C'.repeat(128)]
];

standardTests.forEach(([path, shouldMatch, expected]) => {
	totalTests++;
	if (testIbcPattern(path, shouldMatch, expected)) passedTests++;
});

// Edge cases - should NOT match
console.log(colors.yellow + '\nEdge Cases (should NOT match):' + colors.reset);
const edgeCases = [
	['/ibc/ABC123/extra', false],
	['/ibc/ABC123/', false],
	['/ibc/ABC/123', false],
	['/ibc/', false],
	['ibc/ABC123', false],
	['/ibcABC123', false]
];

edgeCases.forEach(([path, shouldMatch]) => {
	totalTests++;
	if (testIbcPattern(path, shouldMatch)) passedTests++;
});

// Special characters
console.log(colors.yellow + '\nSpecial Characters (should match):' + colors.reset);
const specialCharTests = [
	['/ibc/ABC-123', true, 'ABC-123'],
	['/ibc/ABC_123', true, 'ABC_123'],
	['/ibc/ABC.123', true, 'ABC.123'],
	['/ibc/ABC+123', true, 'ABC+123'],
	['/ibc/ABC=123', true, 'ABC=123'],
	['/ibc/ABC%123', true, 'ABC%123']
];

specialCharTests.forEach(([path, shouldMatch, expected]) => {
	totalTests++;
	if (testIbcPattern(path, shouldMatch, expected)) passedTests++;
});

// URL Rewriting tests
console.log(colors.yellow + '\nURL Rewriting Tests:' + colors.reset);
const rewriteTests = [
	['/ibc/CA6FBFAF399474A06263E10D0CE5AEBBE15189D6D4B2DD9ADE61007E68EB9DB0', '/ibc%2FCA6FBFAF399474A06263E10D0CE5AEBBE15189D6D4B2DD9ADE61007E68EB9DB0'],
	['/ibc/ABC123', '/ibc%2FABC123'],
	['/ibc/TEST_HASH-123', '/ibc%2FTEST_HASH-123'],
	['/factory/sei1abc/token', '/factory%2Fsei1abc%2Ftoken'],
	['/ibc/ABC/123', '/ibc/ABC/123'], // Should not rewrite
	['/other/path', '/other/path'] // Should not rewrite
];

rewriteTests.forEach(([original, expected]) => {
	totalTests++;
	const rewritten = simulateCaddyRewrite(original);
	const passed = rewritten === expected;
	if (passed) passedTests++;
	
	console.log(
		`${passed ? colors.green + '✓' : colors.red + '✗'} ${colors.reset}` +
		`Rewrite: "${original}" → "${rewritten}" ` +
		`${passed ? '' : `(expected: "${expected}")`}`
	);
});

// Summary
console.log(colors.blue + '\n=== Test Summary ===' + colors.reset);
console.log(`Total tests: ${totalTests}`);
console.log(`Passed: ${colors.green}${passedTests}${colors.reset}`);
console.log(`Failed: ${colors.red}${totalTests - passedTests}${colors.reset}`);
console.log(`Success rate: ${((passedTests / totalTests) * 100).toFixed(1)}%\n`);

// Additional verification
console.log(colors.blue + '=== Additional Verification ===' + colors.reset);
console.log('URL encoding verification:');
console.log(`encodeURIComponent('/') = "${encodeURIComponent('/')}"`);
console.log(`decodeURIComponent('%2F') = "${decodeURIComponent('%2F')}"`);

// Exit with appropriate code
process.exit(totalTests === passedTests ? 0 : 1);