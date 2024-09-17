document.getElementById('checkButton').addEventListener('click', async function () {
    const addressInput = document.getElementById('addressInput').value;
    const fileInput = document.getElementById('fileInput').files[0];

    let requestData = {};

    if (addressInput) {
        // Handle comma-separated addresses
        const addresses = addressInput.split(',').map(addr => addr.trim());
        if (addresses.length === 1) {
            requestData.address = addresses[0];
        } else {
            requestData.assets = addresses;
        }
    } else if (fileInput) {
        // Handle JSON file upload
        const fileContent = await fileInput.text();
        try {
            const parsedJson = JSON.parse(fileContent);
            if (Array.isArray(parsedJson.assets)) {
                requestData.assets = parsedJson.assets;
            } else {
                document.getElementById('result').innerText = 'Invalid JSON format in uploaded file.';
                return;
            }
        } catch (error) {
            document.getElementById('result').innerText = 'Error parsing JSON file: ' + error.message;
            return;
        }
    } else {
        document.getElementById('result').innerText = 'Please enter an address or upload a JSON file.';
        return;
    }

    // Make the API request
    const response = await fetch('/check-address', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
    });

    const result = await response.json();
    document.getElementById('result').innerText = JSON.stringify(result, null, 2);
});
