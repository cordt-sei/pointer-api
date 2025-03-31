/**
 * Test script to verify API key configuration
 */
const axios = require('axios');
require('dotenv').config();

const SEIREST = process.env.SEIREST || 'https://rest.sei-apis.com';
const API_KEY = process.env.API_KEY;

// Simple test endpoint 
const TEST_ENDPOINT = '/sei-protocol/seichain/evm/pointer';
const TEST_PARAMS = { pointerType: 0, pointee: '0x809FF4801aA5bDb33045d1fEC810D082490D63a4' };

async function testApiKey() {
  console.log('\nAPI Key Verification Test');
  console.log(`API Endpoint: ${SEIREST}`);
  console.log(`API Key Present: ${API_KEY ? 'Yes' : 'No'}`);
  
  if (!API_KEY) {
    console.error('\nERROR: API_KEY environment variable is not set.');
    console.error('Set the API_KEY value in your .env file or environment variables.');
    return;
  }
  
  try {
    console.log('\nTesting API connection with key...');
    
    const response = await axios.get(`${SEIREST}${TEST_ENDPOINT}`, {
      params: TEST_PARAMS,
      headers: {
        'x-api-key': API_KEY
      },
      timeout: 5000
    });
    
    console.log(`\nSUCCESS: API connection successful (Status: ${response.status})`);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    console.log('\nYour API key is correctly configured and working.');
  } catch (error) {
    console.error('\nERROR: Failed to connect to API');
    
    if (error.response) {
      console.error(`Status: ${error.response.status} - ${error.response.statusText}`);
      
      if (error.response.status === 429) {
        console.error('ISSUE: Rate limit exceeded. Your API key may not be valid or has exceeded its quota.');
      } else if (error.response.status === 403) {
        console.error('ISSUE: Authentication failed. Your API key is invalid.');
      }
      
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    } else if (error.request) {
      console.error('ISSUE: No response received from server. The API endpoint might be down or unreachable.');
    } else {
      console.error('ISSUE:', error.message);
    }
    
    console.error('\nPlease check your API key and try again.');
  }
}

testApiKey();
