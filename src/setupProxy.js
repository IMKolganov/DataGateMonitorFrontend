const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  const target = process.env.REACT_APP_PROXY_TARGET;

  if (!target) {
    console.log("[Proxy] ❌ No REACT_APP_PROXY_TARGET — skipping");
    return;
  }

  console.log(`[Proxy] ➜ Proxying '/api' to ${target}`);

  app.use(
    '/api',
    createProxyMiddleware({
      target,
      changeOrigin: true,
      ws: true,
    })
  );
};
