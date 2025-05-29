const axios = require('axios');

module.exports = async function (context, req) {
    context.log('postSAPdata function triggered');

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

        // Get query parameters from the request
        const queryParams = new URLSearchParams();
        
        // Add all query parameters from the original request
        if (req.query.DecisionKey) queryParams.append('DecisionKey', req.query.DecisionKey);
        if (req.query.InstanceID) queryParams.append('InstanceID', req.query.InstanceID);
        if (req.query.Comments) queryParams.append('Comments', req.query.Comments);

        const queryString = queryParams.toString();
        const sapUrl = `https://c6674ca9trial.it-cpitrial03-rt.cfapps.ap21.hana.ondemand.com/http/postSAPdata${queryString ? '?' + queryString : ''}`;

        context.log('Making POST request to SAP API:', sapUrl);
        
        const response = await axios.post(
            sapUrl,
            {}, // Empty body for POST request
            {
                headers: {
                    'Authorization': authHeader,
                    'Accept': 'application/xml,application/json',
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );

        context.log('SAP API POST response received');

        context.res = {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Content-Type': 'application/json'
            },
            body: response.data
        };

    } catch (error) {
        context.log.error('Error calling SAP POST API:', error.message);
        
        context.res = {
            status: error.response?.status || 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: {
                error: 'Failed to post SAP data',
                details: error.message,
                status: error.response?.status
            }
        };
    }
};
