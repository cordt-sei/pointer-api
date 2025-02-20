const express = require('express');
const { determineAssetProperties } = require('./src/utils/determineProps');

const app = express();
const PORT = 3003;

// Middleware to parse JSON request bodies
app.use(express.json());

// Route to handle GET requests with an address parameter
app.get('/:address', async (req, res) => {
    try {
        let { address } = req.params;
        if (!address) {
            return res.status(400).json({ error: 'Address parameter is required.' });
        }
        
        // Decode URL-encoded characters (e.g., %2F → /)
        address = decodeURIComponent(address);

        // Process the address and determine asset properties
        const result = await determineAssetProperties(address);

        // Return the result in JSON format, but ensure the correct format
        res.json({
            address,
            ...result
        });
    } catch (error) {
        console.error('Error processing request:', error.message);
        res.status(500).json({ error: 'Failed to process the request.' });
    }
});

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
