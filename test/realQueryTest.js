const { determineAssetProperties } = require('../src/utils/determineProps');

// Define known constants
const testCases = [
  {
    description: "Natural ERC20 with known pointer",
    address: '0x809FF4801aA5bDb33045d1fEC810D082490D63a4',
  },
  {
    description: "Known pointer for a natural ERC20",
    address: 'sei1msjly0e2v5u99z53vqre47ltv0fsfa6h9fzrljuvp0e5zg76x7fswxcxjl',
  },
  {
    description: "Natural CW20 with known pointer",
    address: 'sei1hrndqntlvtmx2kepr0zsfgr7nzjptcc72cr4ppk4yav58vvy7v3s4er8ed',
  },
  {
    description: "IBC token with known pointer",
    address: 'ibc/CA6FBFAF399474A06263E10D0CE5AEBBE15189D6D4B2DD9ADE61007E68EB9DB0',
  },
  {
    description: "Token without a known pointer",
    address: 'sei1usww9g7zd3yt3n3d525457yzjw2jxh5s38ad43894zkfl83cgnksz7fnce',
  },
];

// Run tests
(async () => {
  for (const testCase of testCases) {
    console.log(`Running test: ${testCase.description}`);
    const result = await determineAssetProperties(testCase.address);
    console.log(`Result for ${testCase.address}:`, result);
    console.log('------------------------------------------');
  }
})();
