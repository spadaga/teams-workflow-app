const axios = require('axios');

module.exports = async function (context, req) {
    context.log('getSAPdata function triggered');

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        context.res = {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            }
        };
        return;
    }

    try {
        // Get authorization header - try multiple ways
        const authHeader = req.headers.authorization || req.headers.Authorization;
        
        context.log('Authorization header:', authHeader ? 'Present' : 'Missing');
        context.log('All headers:', JSON.stringify(req.headers));
        
        if (!authHeader) {
            context.res = {
                status: 401,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: { 
                    error: 'Authorization header missing',
                    receivedHeaders: Object.keys(req.headers)
                }
            };
            return;
        }

        context.log('Making request to SAP API...');
        
        const response = await axios.get(
            'https://c6674ca9trial.it-cpitrial03-rt.cfapps.ap21.hana.ondemand.com/http/getSAPdata',
            {
                headers: {
                    'Authorization': authHeader,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );

        context.log('SAP API response received successfully');

        context.res = {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: response.data
        };

    } catch (error) {
        context.log.error('Error calling SAP API:', error.message);
        context.log.error('Error details:', error.response?.data);
        
        context.res = {
            status: error.response?.status || 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: {
                error: 'Failed to fetch SAP data',
                details: error.message,
                sapStatus: error.response?.status,
                sapData: error.response?.data
            }
        };
    }
};
