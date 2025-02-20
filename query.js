const axios = require('axios');

const SEIREST = 'https://api.sei.basementnodes.ca';

async function queryAPI(endpoint, params) {
    try {
        // Construct the full URL
        const fullURL = `${SEIREST}${endpoint}`;
        // Perform the API request
        const response = await axios.get(fullURL, { params });
        return response.data;
    } catch (error) {
        console.error('Error querying API:', error.message);
        return null;
    }
}

module.exports = { queryAPI };
