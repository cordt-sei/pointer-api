const express = require('express');
const { checkAddresses } = require('./src/api/checkAddresses');

const app = express();
const PORT = 3003;  // Changed to port 3003

// parse JSON request bodies
app.use(express.json());

// log incoming requests
app.use((req, res, next) => {
    console.log(`Received request: ${req.method} ${req.url}`);
    console.log('Query params:', req.query);
    console.log('Request body:', req.body);
    next();
});

// Handle requests with both query params and request body
app.post('/', checkAddresses);

// Listen on the specified port
app.listen(PORT, () => {
    console.log(`API server running at http://localhost:${PORT}`);
});
