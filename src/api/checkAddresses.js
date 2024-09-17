const { determineAssetProperties } = require('../utils/determineProps');

async function checkAddresses(req, res) {
    const { address, addresses } = req.body;

    if (!address && !addresses) {
        return res.status(400).json({ error: 'An address or an array of addresses is required' });
    }

    // Single asset
    if (address) {
        try {
            const result = await determineAssetProperties(address);
            return res.json({ address, ...result });
        } catch (error) {
            console.error('Error processing address:', error.message);
            return res.status(500).json({ error: 'Failed to process the address' });
        }
    }

    // Array of assets
    if (Array.isArray(addresses)) {
        try {
            // Use Promise.all to make concurrent API calls
            const results = await Promise.all(
                addresses.map(async (addr) => {
                    const result = await determineAssetProperties(addr);
                    return { address: addr, ...result };
                })
            );
            return res.json(results);
        } catch (error) {
            console.error('Error processing addresses:', error.message);
            return res.status(500).json({ error: 'Failed to process the addresses' });
        }
    }

    return res.status(400).json({ error: 'Invalid input format. Must provide an address or a JSON array.' });
}

module.exports = { checkAddresses };