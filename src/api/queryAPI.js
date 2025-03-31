const axios = require('axios');
const SEIREST = process.env.SEIREST || 'https://rest.sei-apis.com';
const API_KEY = process.env.API_KEY;

async function queryAPI(endpoint, params) {
    try {
        const response = await axios.get(`${SEIREST}${endpoint}`, {
            params,
            headers: {
                'x-api-key': API_KEY
            },
            timeout: 5000 // 5 second timeout to prevent hanging
        });
        return response.data;
    } catch (error) {
        // Log error details but keep same return format
        if (error.response) {
            console.error('Error querying API:', error.response?.data || error.message);
            if (error.response.status === 429) {
                console.error('API Rate Limit Exceeded');
            }
        } else {
            console.error('Error querying API:', error.message);
        }
        return null;
    }
}

module.exports = { queryAPI };
