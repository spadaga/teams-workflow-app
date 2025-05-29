const axios = require('axios');

module.exports = async function (context, req) {
    context.log('getSAPdata function triggered');

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
        const authHeader = req.headers.authorization || req.headers.Authorization;
        context.log('Authorization header:', authHeader ? authHeader.substring(0, 50) + '...' : 'Missing');
        context.log('All headers:', JSON.stringify(req.headers));
        context.log('Request URL:', 'https://c6674ca9trial.it-cpitrial03-rt.cfapps.ap21.hana.ondemand.com/http/getSAPdata');
        context.log('Outgoing headers:', JSON.stringify({
            Authorization: authHeader,
            Accept: 'application/json',
            'Content-Type': 'application/json'
        }));

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

        context.log('SAP API response:', JSON.stringify(response.data, null, 2));
        context.log('Response headers:', JSON.stringify(response.headers));

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
        context.log.error('Error details:', JSON.stringify(error.response?.data, null, 2));
        context.log.error('Response headers:', JSON.stringify(error.response?.headers));
        context.log.error('Request config:', JSON.stringify(error.config, null, 2));

        context.res = {
            status: error.response?.status || 500,
            headers: { 'Access-Control-Allow-Origin': '*' },
            body: {
                error: 'Failed to fetch SAP data',
                details: error.message,
                sapStatus: error.response?.status,
                sapData: error.response?.data,
                requestHeaders: error.config?.headers,
                requestUrl: error.config?.url
            }
        };
    }
};