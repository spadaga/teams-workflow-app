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
        const authHeader = req.headers.authorization;
        
        if (!authHeader) {
            context.res = {
                status: 401,
                headers: { 'Access-Control-Allow-Origin': '*' },
                body: { error: 'Authorization header missing' }
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

        context.log('SAP API response received');

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
        
        context.res = {
            status: error.response?.status || 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: {
                error: 'Failed to fetch SAP data',
                details: error.message
            }
        };
    }
};
