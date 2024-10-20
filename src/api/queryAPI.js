const axios = require('axios');
const SEIREST = 'http://tasty.seipex.fi:1317';

// Function to perform REST API calls
async function queryAPI(endpoint, params) {
    try {
        const response = await axios.get(`${SEIREST}${endpoint}`, { params });
        return response.data;
    } catch (error) {
        console.error('Error querying API:', error.message);
        return null;
    }
}

module.exports = { queryAPI };
