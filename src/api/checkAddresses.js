const { determineAssetProperties } = require('../utils/determineType');

async function checkAddresses(req, res) {
    const { address, assets } = req.body;

    if (!address && !assets) {
        return res.status(400).json({ error: 'An address or an array of addresses is required' });
    }

    // Handle single address case
    if (address) {
        const result = await determineAssetProperties(address);
        return res.json({ address, ...result });
    }

    // Handle array of addresses case
    if (Array.isArray(assets)) {
        const results = await Promise.all(assets.map(async (addr) => {
            const result = await determineAssetProperties(addr);
            return { address: addr, ...result };
        }));
        return res.json(results);
    }

    return res.status(400).json({ error: 'Invalid input format. Must provide an address or a JSON array.' });
}

module.exports = { checkAddresses };
