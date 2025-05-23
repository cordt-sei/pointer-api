import { determineAssetProperties } from '../utils/determineProps.js';
import { log } from '../utils/logger.js';

export async function checkAddresses(req, res) {
    // Check both query params and body for address or addresses
    const address = req.query.address || req.body.address;
    const addresses = req.query.addresses || req.body.addresses;

    log('DEBUG', 'Parsed address data', { address, addresses });

    if (!address && !addresses) {
        return res.status(400).json({ error: 'An address or an array of addresses is required' });
    }

    // Single asset
    if (address) {
        try {
            const result = await determineAssetProperties(address);
            return res.json({ address, ...result });
        } catch (error) {
            log('ERROR', 'Error processing address', { address, error: error.message });
            return res.status(500).json({ error: 'Failed to process the address' });
        }
    }

    // Array of assets
    if (Array.isArray(addresses)) {
        try {
            const results = await Promise.all(
                addresses.map(async (addr) => {
                    const result = await determineAssetProperties(addr);
                    return { address: addr, ...result };
                })
            );
            return res.json(results);
        } catch (error) {
            log('ERROR', 'Error processing addresses', { error: error.message });
            return res.status(500).json({ error: 'Failed to process the addresses' });
        }
    }

    return res.status(400).json({ error: 'Invalid input format. Must provide an address or a JSON array.' });
}
