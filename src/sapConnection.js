import axios from 'axios';

// Token caching
let cachedToken = null;
let tokenExpiry = null;

/**
 * Helper function to get the correct API URL for all environments
 * @param {string} endpoint - The API endpoint (should start with /)
 * @returns {string} The complete URL
 */
function getApiUrl(endpoint) {
    // Always use /api prefix for consistency across all environments
    // Local: goes through setupProxy.js
    // Vercel: goes through vercel.json rewrites
    // Teams: works the same as Vercel
    return `/api${endpoint}`;
}

/**
 * Fetches an access token from the SAP API using client credentials.
 * Uses caching to avoid unnecessary requests.
 * @returns {Promise<string>} The access token.
 * @throws {Error} If the token request fails.
 */
export async function getAccessToken() {
    if (cachedToken && tokenExpiry && new Date() < tokenExpiry) {
        console.log('Using cached token length:', cachedToken.length);
        return cachedToken;
    }

    try {
        console.log('Fetching new access token...');
        
        const clientId = 'sb-f1a14846-2bbd-4ce8-b26f-9d5cb15fe4ad!b63281|it-rt-c6674ca9trial!b196';
        const clientSecret = '7b341fef-ee5c-41e3-88da-debd83c88943$VuzFDZSpA2bVUSU_jCHBW5xYiiOk3UZUx7xyI8nvxns=';
        
        const basicAuth = btoa(`${clientId}:${clientSecret}`);
        
        // Token endpoint doesn't go through proxy - direct call
        const tokenResponse = await axios.post(
            'https://c6674ca9trial.authentication.ap21.hana.ondemand.com/oauth/token',
            new URLSearchParams({
                grant_type: 'client_credentials'
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Basic ${basicAuth}`
                }
            }
        );

        cachedToken = tokenResponse.data.access_token;
        console.log('New token length:', cachedToken.length);
        console.log('Token starts with:', cachedToken.substring(0, 50) + '...');
        
        const expiresIn = tokenResponse.data.expires_in || 3600;
        tokenExpiry = new Date(Date.now() + (expiresIn - 300) * 1000);
        
        return cachedToken;

    } catch (error) {
        console.error('Token fetch error:', error.response?.data);
        throw error;
    }
}

/**
 * Fetches SAP workflows using the access token.
 * @returns {Promise<Array>} The list of workflows.
 * @throws {Error} If the API request fails.
 */
export async function fetchSAPWorkflows() {
    try {
        const accessToken = await getAccessToken();
        console.log('Now Fetching workflows with token...');
        
        const response = await axios.get(getApiUrl('/http/getSAPdata'), {
            headers: { 
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        console.log('Raw SAP response:', response.data);
        
        let workflows = [];
        if (response.data && response.data.TaskCollection && response.data.TaskCollection.Task) {
            workflows = Array.isArray(response.data.TaskCollection.Task) 
                ? response.data.TaskCollection.Task 
                : [response.data.TaskCollection.Task];
        } else if (Array.isArray(response.data)) {
            workflows = response.data;
        } else {
            console.warn('Unexpected response format:', response.data);
            workflows = [];
        }

        return workflows;
        
    } catch (error) {
        console.error('SAP API Error in fetchSAPWorkflows:', {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            message: error.message,
            config: error.config
        });
        
        if (error.response?.status === 401) {
            cachedToken = null;
            tokenExpiry = null;
            throw new Error('Authentication expired. Please refresh and try again.');
        } else if (error.response?.status === 0 || error.code === 'ERR_NETWORK') {
            throw new Error('Network error: Please check CORS configuration or use a proxy.');
        }
        
        throw new Error(`Failed to fetch workflows: ${error.message}`);
    }
}

/**
 * Approves a workflow in SAP.
 * @param {string} instanceId - The workflow instance ID.
 * @returns {Promise<string>} The status of the workflow after approval.
 * @throws {Error} If the API request fails.
 */
export async function approveWorkflow(instanceId) {
    try {
        const accessToken = await getAccessToken();
        console.log(`Approving workflow ${instanceId}...`);
        
        const response = await axios.post(
            getApiUrl(`/http/postSAPdata?DecisionKey=0001&InstanceID=${instanceId}&Comments=Approved`),
            {},
            { 
                headers: { 
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/xml,application/json',
                    'Content-Type': 'application/json'
                } 
            }
        );

        console.log('Approval response:', response.data);

        // Handle XML response
        if (typeof response.data === 'string' && response.data.includes('<?xml')) {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(response.data, 'text/xml');
            const status = xmlDoc.querySelector('Task > Status')?.textContent;
            
            if (status !== 'COMPLETED') {
                throw new Error(`Approval failed for ${instanceId}. Status: ${status}`);
            }
            return status;
        } else {
            // Handle JSON response
            const status = response.data?.Status || response.data?.status;
            return status || 'COMPLETED';
        }
        
    } catch (error) {
        console.error(`Error approving workflow ${instanceId}:`, {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            message: error.message
        });
        
        if (error.response?.status === 401) {
            cachedToken = null;
            tokenExpiry = null;
            throw new Error('Authentication expired. Please refresh and try again.');
        } else if (error.response?.status === 0 || error.code === 'ERR_NETWORK') {
            throw new Error('Network error: Please check CORS configuration or use a proxy.');
        }
        
        throw new Error(`Failed to approve workflow ${instanceId}: ${error.message}`);
    }
}

/**
 * Rejects a workflow in SAP.
 * @param {string} instanceId - The workflow instance ID.
 * @returns {Promise<string>} The status of the workflow after rejection.
 * @throws {Error} If the API request fails.
 */
export async function rejectWorkflow(instanceId) {
    try {
        const accessToken = await getAccessToken();
        console.log(`Rejecting workflow ${instanceId}...`);
        
        const response = await axios.post(
            getApiUrl(`/http/postSAPdata?DecisionKey=0002&InstanceID=${instanceId}&Comments=Rejected`),
            {},
            { 
                headers: { 
                    'Authorization': `Bearer ${accessToken}`,
                    'Accept': 'application/xml,application/json',
                    'Content-Type': 'application/json'
                } 
            }
        );

        console.log('Rejection response:', response.data);

        // Handle XML response
        if (typeof response.data === 'string' && response.data.includes('<?xml')) {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(response.data, 'text/xml');
            const status = xmlDoc.querySelector('Task > Status')?.textContent;
            
            if (status !== 'COMPLETED') {
                throw new Error(`Rejection failed for ${instanceId}. Status: ${status}`);
            }
            return status;
        } else {
            // Handle JSON response
            const status = response.data?.Status || response.data?.status;
            return status || 'COMPLETED';
        }
        
    } catch (error) {
        console.error(`Error rejecting workflow ${instanceId}:`, {
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            message: error.message
        });
        
        if (error.response?.status === 401) {
            cachedToken = null;
            tokenExpiry = null;
            throw new Error('Authentication expired. Please refresh and try again.');
        } else if (error.response?.status === 0 || error.code === 'ERR_NETWORK') {
            throw new Error('Network error: Please check CORS configuration or use a proxy.');
        }
        
        throw new Error(`Failed to reject workflow ${instanceId}: ${error.message}`);
    }
}
