const express = require('express');
const { checkAddresses } = require('./src/api/checkAddresses');

const app = express();
const PORT = 3001;

// Middleware to parse JSON request bodies
app.use(express.json());

app.post('/check-address', checkAddresses);

app.listen(PORT, () => {
    console.log(`API server running at http://localhost:${PORT}`);
});
