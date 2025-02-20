const express = require('express');
const { determineAssetProperties } = require('./src/utils/determineProps');
const { queryAPI } = require('./src/api/queryAPI'); // ✅ Correct import

const app = express();
const PORT = 3003;

// Enable debugging logs if set to `true`
const DEBUG = false;
app.use(express.json());

// Route to handle GET requests with an address parameter
app.get('/:address', async (req, res) => {
    try {
        let { address } = req.params;
        if (DEBUG) console.log("🔥 Received GET request for address:", address);

        if (!address) {
            return res.status(400).json({ error: 'Address parameter is required.' });
        }

        // Decode URL-encoded characters (e.g., %2F → /)
        address = decodeURIComponent(address);
        if (DEBUG) console.log("🔍 Decoded address:", address);

        // Process the address and determine asset properties
        const result = await determineAssetProperties(address);

        if (DEBUG) console.log("✅ Processed address result:", result);

        res.json(result);
    } catch (error) {
        console.error('❌ Error processing GET request:', error.message);
        res.status(500).json({ error: 'Failed to process the request.' });
    }
});

// Route to handle POST requests for multiple addresses
app.post('/', async (req, res) => {
    try {
        const { address, addresses } = req.body;
        let addressList = [];

        // Check if a single address or a list of addresses is provided
        if (address) {
            addressList = [address];
        } else if (Array.isArray(addresses)) {
            addressList = addresses;
        } else {
            return res.status(400).json({ error: 'Either "address" or "addresses" is required in the request body.' });
        }

        if (DEBUG) console.log("🔥 Received POST request for addresses:", addressList);

        // Process each address and determine asset properties
        const results = await Promise.all(addressList.map(determineAssetProperties));

        if (DEBUG) console.log("✅ Processed POST request result:", results);

        res.json(results);
    } catch (error) {
        console.error('❌ Error processing POST request:', error.message);
        res.status(500).json({ error: 'Failed to process the request.' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`🚀 API server running at http://localhost:${PORT}`);
});
