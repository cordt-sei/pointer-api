const express = require('express');
const { determineAssetProperties } = require('./src/utils/determineProps');
const { queryAPI } = require('./src/api/queryAPI');

const app = express();
const PORT = process.env.PORT || 3003;

// Enable debugging logs if set to `true`
const DEBUG = false;
app.use(express.json());

// Route to handle GET requests with an address parameter
app.get('/:address', async (req, res) => {
    try {
        let { address } = req.params;
        if (DEBUG) console.log("Received GET request for address:", address);

        if (!address) {
            return res.status(400).json({ error: 'Address parameter is required.' });
        }

        // Decode URL-encoded characters (e.g., %2F → /)
        address = decodeURIComponent(address);
        if (DEBUG) console.log("Decoded address:", address);

        // Process the address and determine asset properties
        const result = await determineAssetProperties(address);

        if (DEBUG) console.log("Processed address:", result);

        // Check if there was an error in the result
        if (result.error) {
            return res.status(404).json({ error: result.error });
        }

        res.json(result);
    } catch (error) {
        console.error('Error processing GET request:', error);

        // Handle rate limiting specifically
        if (error.response && error.response.status === 429) {
            return res.status(429).json({
                error: 'Rate limit exceeded. Please try again later.',
                details: 'If this issue persists, please open an issue at: https://github.com/cordt-sei/pointer-api/issues'
            });
        }

        // Generic error handler
        res.status(500).json({
            error: 'Failed to process the request: ' + error.message,
            details: 'Please open an issue at: https://github.com/cordt-sei/pointer-api/issues'
        });
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
            return res.status(400).json({ error: '"address" or "addresses" array required in request body.' });
        }

        if (DEBUG) console.log("Received POST request for addresses:", addressList);

        // Validate addresses
        if (addressList.length === 0) {
            return res.status(400).json({ error: 'No addresses provided.' });
        }

        // Process each address and determine asset properties
        try {
            const results = await Promise.all(
                addressList.map(async (addr) => {
                    try {
                        return await determineAssetProperties(addr);
                    } catch (addrError) {
                        console.error(`Error processing address ${addr}:`, addrError.message);
                        return {
                            address: addr,
                            error: 'Failed to process address: ' + addrError.message,
                            isBaseAsset: null,
                            isPointer: null,
                            pointerType: null,
                            pointerAddress: null,
                            pointeeAddress: null
                        };
                    }
                })
            );

            if (DEBUG) console.log("Processed POST request:", results);

            // Return a single object for a single address, or an array for multiple addresses
            res.json(addressList.length === 1 ? results[0] : results);
        } catch (error) {
            console.error('Error in Promise.all:', error.message);
            throw error;
        }
    } catch (error) {
        console.error('Error processing POST request:', error);

        // Handle rate limiting specifically
        if (error.response && error.response.status === 429) {
            return res.status(429).json({
                error: 'Rate limit exceeded. Please try again later.',
                details: 'If this issue persists, please open an issue at: https://github.com/cordt-sei/pointer-api/issues'
            });
        }

        // Generic error handler
        res.status(500).json({
            error: 'Failed to process the request: ' + error.message,
            details: 'Please open an issue at: https://github.com/cordt-sei/pointer-api/issues'
        });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`API server running at http://localhost:${PORT}`);
});
