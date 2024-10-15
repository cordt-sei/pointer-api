const express = require('express');
const { determineAssetProperties } = require('./utils/determineProps');

const app = express();
const PORT = 3003; // Ensure the port is correct

// Middleware to log incoming requests
app.use(express.json());
app.use((req, res, next) => {
    console.log(`Received request: ${req.method} ${req.url}`);
    next();
});

// GET request handler for querying by token address
app.get('/:address', async (req, res) => {
    try {
        const { address } = req.params;
        if (!address) {
            return res.status(400).json({ error: 'Address is required' });
        }

        // Call the function to determine asset properties for the address
        const result = await determineAssetProperties(address);

        // Respond with the result in JSON format
        return res.json(result);
    } catch (error) {
        console.error('Error processing address:', error.message);
        return res.status(500).json({ error: 'Failed to process the address' });
    }
});

// Start listening on the specified port
app.listen(PORT, () => {
    console.log(`API server running at http://localhost:${PORT}`);
});