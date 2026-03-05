import express, { Request, Response } from 'express';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import morgan from 'morgan';
import config, { ServiceConfig } from './config';

const app = express();

// Logging
app.use(morgan('combined'));

const mode: number = config.mode;
console.log(`Starting Proxy Service in Mode: ${mode}`);

const services = config.services;

// Proxy Options Generator
const createOptions = (target: ServiceConfig, paths: string[]): Options => ({
    target: target.url,
    changeOrigin: true,
    pathFilter: paths,
    pathRewrite: (path: string, req: any) => {
        if (mode === 1 && paths.includes(interfaces.sendAndWait) && req.headers['forwarddoauth']) {
            return interfaces.doAuth;
        }
        return path;
    },
    router: (req: any) => {
        if (mode === 1 && paths.includes(interfaces.sendAndWait) && req.headers['forwarddoauth']) {
            return services.D.url;
        }
        return undefined;
    },
    on: {
        error: (err: Error, req: any, res: any) => {
            console.error(`Error proxing to ${target.url}:`, err.message);
            res.status(502).json({ error: 'Bad Gateway', message: 'Target service unavailable' });
        }
    }
});

// Route Definitions
interface Interfaces {
    sendAndWait: string;
    sendNoWait: string;
    queryIP: string;
    IPChanged: string;
    ping: string;
    doAuth: string;
    downloadCert: string;
    renewCert: string;
}

const interfaces: Interfaces = {
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
    const routesC: string[] = [
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
    const routesE: string[] = [
        interfaces.sendAndWait,
        interfaces.sendNoWait,
        interfaces.ping,
        interfaces.renewCert
    ];
    const routesD: string[] = [
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
    const routesD: string[] = [
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
const allKnownRoutes: string[] = Object.values(interfaces);
app.use(allKnownRoutes, (req: Request, res: Response) => {
    res.status(404).json({ 
        error: 'Not Found', 
        message: `Interface ${req.path} is not active in current mode (${mode})` 
    });
});

// General 404 for unknown routes
app.use((req: Request, res: Response) => {
    res.status(404).json({ error: 'Not Found', message: 'Unknown endpoint' });
});

// Export app for testing, start server if main module
if (require.main === module) {
    app.listen(config.port, () => {
        console.log(`Proxy Service B listening on port ${config.port}`);
    });
}

export default app;
