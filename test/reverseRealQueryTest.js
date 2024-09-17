const { determineAssetProperties } = require('../src/utils/determineType'); // Import your function

// Define reverse test cases
const reverseTestCases = [
  {
    description: "Reverse test: Known pointer for a natural ERC20",
    address: 'sei15ulpjml9ddyyupy9sawwc7wnmnzfl44jyg3j43e4vy5cfwgunh8qfhag22',
  },
  {
    description: "Reverse test: Natural ERC20 for a known pointer",
    address: '0xd78BE621436e69C81E4d0e9f29bE14C5EC51E6Ae',
  },
  {
    description: "Reverse test: Pointer for a natural CW20",
    address: '0x5f0E07dFeE5832Faa00c63F2D33A0D79150E8598',
  },
  {
    description: "Reverse test: Known pointer for an IBC token",
    address: '0x3894085Ef7Ff0f0aeDf52E2A2704928d1Ec074F1',
  }
];

// Run reverse tests
(async () => {
  for (const testCase of reverseTestCases) {
    console.log(`Running test: ${testCase.description}`);
    const result = await determineAssetProperties(testCase.address);
    console.log(`Result for ${testCase.address}:`, result);
    console.log('------------------------------------------');
  }
})();
