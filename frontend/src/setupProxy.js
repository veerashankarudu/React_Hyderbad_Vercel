/**
 * CRA dev-server proxy middleware.
 * 1. Sets Cache-Control: no-store on every response.
 * 2. Rewrites the HTML response to add a timestamp query param to bundle.js
 *    so the VS Code webview (and all browsers) always load the latest bundle.
 */
module.exports = function (app) {
  app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // For HTML responses, inject a version stamp into JS/CSS src URLs
    if (req.accepts('html')) {
      const origSend = res.send.bind(res);
      res.send = function (body) {
        if (typeof body === 'string' && body.includes('<script')) {
          const v = Date.now();
          body = body.replace(/(src="\/static\/js\/[^"?]+\.js)(")/g, `$1?v=${v}$2`);
          body = body.replace(/(href="\/static\/css\/[^"?]+\.css)(")/g, `$1?v=${v}$2`);
        }
        origSend(body);
      };
    }
    next();
  });
};

