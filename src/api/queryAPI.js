import axios from 'axios';
import dotenv from 'dotenv';
import { log } from '../utils/logger.js';

dotenv.config();

const SEIREST = process.env.SEIREST;
const USERNAME = process.env.API_USERNAME;
const PASSWORD = process.env.API_PASSWORD;

/**
 * Query the Sei REST API with proper error handling
 * 
 * @param {string} endpoint - API endpoint to query
 * @param {object} params - Query parameters
 * @returns {Promise<object|null>} - Response data or null if error
 */
export async function queryAPI(endpoint, params) {
    try {
        // Create a unique ID for this query for tracking in logs
        const queryId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
        
        // Log the original params (which don't contain the API key)
        log('DEBUG', `API request to ${endpoint}`, { 
            queryId,
            params,
            timestamp: new Date().toISOString()
        });
        
        // Create a copy of the params to avoid modifying the original
        const queryParams = { ...params };
        
        // Track request time for performance monitoring
        const startTime = Date.now();
        
        const response = await axios.get(`${SEIREST}${endpoint}`, {
            params: queryParams,
            auth: {
                username: USERNAME,
                password: PASSWORD
            },
            timeout: 5000 // 5 second timeout to prevent hanging
        });
        
        const duration = Date.now() - startTime;
        
        log('DEBUG', `API response received from ${endpoint}`, { 
            queryId,
            status: response.status,
            duration: `${duration}ms`,
            data: response.data,
            timestamp: new Date().toISOString()
        });
        
        return response.data;
    } catch (error) {
        // Create a unique ID for error tracking
        const errorId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
        
        // Log error details based on error type
        if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            log('ERROR', `API error response from ${endpoint}`, {
                errorId,
                status: error.response.status,
                statusText: error.response.statusText,
                data: error.response.data,
                params,
                timestamp: new Date().toISOString()
            });
            
            if (error.response.status === 429) {
                log('ERROR', 'API Rate Limit Exceeded', {
                    errorId,
                    endpoint,
                    params,
                    timestamp: new Date().toISOString()
                });
            }
        } else if (error.request) {
            // The request was made but no response was received
            log('ERROR', `No response received from API ${endpoint}`, {
                errorId,
                params,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        } else {
            // Something happened in setting up the request that triggered an Error
            log('ERROR', `Error making API request to ${endpoint}`, {
                errorId,
                params,
                error: error.message,
                stack: error.stack,
                timestamp: new Date().toISOString()
            });
        }
        
        // Always return null so calling code can check for null response
        return null;
    }
}
