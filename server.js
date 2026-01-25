const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const morgan = require('morgan');
const config = require('./config');

const app = express();

// Logging
app.use(morgan('combined'));

const mode = config.mode;
console.log(`Starting Proxy Service in Mode: ${mode}`);

const services = config.services;

// Proxy Options Generator
const createOptions = (target, paths) => ({
    target: target.url,
    changeOrigin: true,
    pathFilter: paths, // Use pathFilter to match requests without stripping path
    // Ensure we capture errors
    onError: (err, req, res) => {
        console.error(`Error proxing to ${target.url}:`, err.message);
        res.status(502).json({ error: 'Bad Gateway', message: 'Target service unavailable' });
    }
});

// Route Definitions
const interfaces = {
    sendAndWait: '/sendAndWait',
    sendNoWait: '/sendNoWait',
    queryIP: '/queryIP',
    IPChanged: '/IPChanged',
    ping: '/ping',
    doAuth: '/doAuth',
    downloadCert: '/downloadCert',
    renewCert: '/renewCert'
};

// Routing Logic based on Mode
if (mode === 0) {
    // Mode 0: sendAndWait, sendNoWait, queryIP, IPChanged -> C
    const routesC = [
        interfaces.sendAndWait,
        interfaces.sendNoWait,
        interfaces.queryIP,
        interfaces.IPChanged
    ];
    // Mount on root, let pathFilter handle matching
    app.use(createProxyMiddleware(createOptions(services.C, routesC)));

} else if (mode === 1) {
    // Mode 1:
    // E: sendAndWait, sendNoWait, ping, renewCert
    // D: queryIP, IPChanged, doAuth, downloadCert
    const routesE = [
        interfaces.sendAndWait,
        interfaces.sendNoWait,
        interfaces.ping,
        interfaces.renewCert
    ];
    const routesD = [
        interfaces.queryIP,
        interfaces.IPChanged,
        interfaces.doAuth,
        interfaces.downloadCert
    ];

    app.use(createProxyMiddleware(createOptions(services.E, routesE)));
    app.use(createProxyMiddleware(createOptions(services.D, routesD)));

} else if (mode === 2) {
    // Mode 2:
    // D: sendAndWait, sendNoWait, queryIP, IPChanged, doAuth, downloadCert
    const routesD = [
        interfaces.sendAndWait,
        interfaces.sendNoWait,
        interfaces.queryIP,
        interfaces.IPChanged,
        interfaces.doAuth,
        interfaces.downloadCert
    ];
    app.use(createProxyMiddleware(createOptions(services.D, routesD)));
}

// Fallback for all defined interfaces that weren't caught by the proxy middlewares
// This handles the "Not supported in this mode" case
const allKnownRoutes = Object.values(interfaces);
app.use(allKnownRoutes, (req, res) => {
    res.status(404).json({ 
        error: 'Not Found', 
        message: `Interface ${req.path} is not active in current mode (${mode})` 
    });
});

// General 404 for unknown routes
app.use((req, res) => {
    res.status(404).json({ error: 'Not Found', message: 'Unknown endpoint' });
});

// Export app for testing, start server if main module
if (require.main === module) {
    app.listen(config.port, () => {
        console.log(`Proxy Service B listening on port ${config.port}`);
    });
}

module.exports = app;
