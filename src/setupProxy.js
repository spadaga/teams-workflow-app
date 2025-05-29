const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'https://c6674ca9trial.it-cpitrial03-rt.cfapps.ap21.hana.ondemand.com',
      changeOrigin: true,
      pathRewrite: {
        '^/api': '', // Remove /api prefix when forwarding to target
      },
      onProxyReq: function (proxyReq, req, res) {
        console.log('Proxying request to:', proxyReq.path);
      },
      onError: function (err, req, res) {
        console.error('Proxy error:', err);
      }
    })
  );
};
