// This file is not part of the deployed application
// It's kept for potential future frontend development

document.getElementById('checkButton').addEventListener('click', async function () {
    const addressInput = document.getElementById('addressInput').value;
    const fileInput = document.getElementById('fileInput').files[0];
    const resultDiv = document.getElementById('result');
    
    // Clear previous results
    resultDiv.innerText = '';
    resultDiv.className = '';

    let requestData = {};

    if (addressInput) {
        // Handle comma-separated addresses
        const addresses = addressInput.split(',').map(addr => addr.trim());
        if (addresses.length === 1) {
            requestData.address = addresses[0];
        } else {
            requestData.addresses = addresses;
        }
    } else if (fileInput) {
        // Handle JSON file upload
        try {
            const fileContent = await fileInput.text();
            const parsedJson = JSON.parse(fileContent);
            if (Array.isArray(parsedJson.addresses)) {
                requestData.addresses = parsedJson.addresses;
            } else if (Array.isArray(parsedJson)) {
                requestData.addresses = parsedJson;
            } else {
                showError('Invalid JSON format in uploaded file. Expected an array of addresses or an object with an "addresses" array.');
                return;
            }
        } catch (error) {
            showError('Error parsing JSON file: ' + error.message);
            return;
        }
    } else {
        showError('Please enter an address or upload a JSON file.');
        return;
    }

    // Show loading state
    resultDiv.innerText = 'Processing request...';

    try {
        // Make the API request
        const response = await fetch('/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });
        
        // Handle HTTP error responses
        if (!response.ok) {
            let errorMessage = 'Server error';
            
            // Try to get more specific error message from response
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || `Error: ${response.status} ${response.statusText}`;
            } catch (e) {
                errorMessage = `Error: ${response.status} ${response.statusText}`;
            }
            
            // Handle specific HTTP status codes
            switch (response.status) {
                case 400:
                    errorMessage = 'Invalid input: ' + errorMessage;
                    break;
                case 403:
                    errorMessage = 'Access denied. API key may be invalid or missing.';
                    break;
                case 429:
                    errorMessage = 'Rate limit exceeded. Please try again later.';
                    break;
                case 500:
                    errorMessage = 'Server error: ' + errorMessage;
                    break;
            }
            
            showError(errorMessage);
            return;
        }

        // Parse and display successful response
        const result = await response.json();
        resultDiv.className = 'success';
        resultDiv.innerText = JSON.stringify(result, null, 2);
    } catch (error) {
        showError('Network or processing error: ' + error.message);
    }
});

// Helper function to display errors
function showError(message) {
    const resultDiv = document.getElementById('result');
    resultDiv.className = 'error';
    resultDiv.innerText = message;
}
