const express = require('express');
const { determineAssetProperties } = require('./src/utils/determineProps');

const app = express();
const PORT = 3003;

// Middleware to parse JSON request bodies
app.use(express.json());

// Route to handle POST requests to the root
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

        // Process each address and determine asset properties
        const results = await Promise.all(addressList.map(determineAssetProperties));

        // Return the results in JSON format
        res.json(results);
    } catch (error) {
        console.error('Error processing request:', error.message);
        res.status(500).json({ error: 'Failed to process the request.' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`API server running at http://localhost:${PORT}`);
});
