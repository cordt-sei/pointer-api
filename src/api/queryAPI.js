const axios = require('axios');
const SEIREST = process.env.SEIREST || 'https://rest.sei-apis.com';
const API_KEY = process.env.API_KEY;

async function queryAPI(endpoint, params) {
    try {
        const response = await axios.get(`${SEIREST}${endpoint}`, {
            params,
            headers: {
                'x-api-key': API_KEY
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error querying API:', error.response?.data || error.message);
        return null;
    }
}

module.exports = { queryAPI };
