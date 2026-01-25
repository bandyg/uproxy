const request = require('supertest');
const { spawn } = require('child_process');
const path = require('path');

let serviceC, serviceD, serviceE;

// Helper to start mock services
const startMock = (file) => {
    // Redirect stdio to ignore mock logs in test output to keep it clean, 
    // or use 'inherit' if debugging is needed.
    return spawn('node', [path.join(__dirname, '../mocks', file)], {
        stdio: 'ignore' 
    });
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

beforeAll(async () => {
    console.log('Starting Mock Services...');
    serviceC = startMock('serviceC.js');
    serviceD = startMock('serviceD.js');
    serviceE = startMock('serviceE.js');
    // Wait for services to be up
    await sleep(2000);
    console.log('Mock Services Started.');
});

afterAll(() => {
    console.log('Stopping Mock Services...');
    if (serviceC) serviceC.kill();
    if (serviceD) serviceD.kill();
    if (serviceE) serviceE.kill();
});

describe('Proxy Service B Routing Logic', () => {
    
    // Helper to reload app with specific mode
    const getApp = (mode) => {
        jest.resetModules();
        process.env.PROXY_MODE = mode.toString();
        // We need to re-require config because it reads env vars at top level
        // jest.resetModules() handles this for us
        return require('../server');
    };

    describe('Mode 0', () => {
        let app;
        beforeAll(() => {
            app = getApp(0);
        });

        test('should forward /sendAndWait to Service C', async () => {
            const res = await request(app).get('/sendAndWait');
            expect(res.status).toBe(200);
            expect(res.body.service).toBe('C');
            expect(res.body.path).toBe('/sendAndWait');
        });

        test('should forward /sendAndWait with query params to Service C', async () => {
            const res = await request(app).get('/sendAndWait?winNum=100&branch=MAIN');
            expect(res.status).toBe(200);
            expect(res.body.service).toBe('C');
            expect(res.body.path).toBe('/sendAndWait');
            expect(res.body.query).toEqual({ winNum: '100', branch: 'MAIN' });
        });

        test('should forward /sendNoWait to Service C', async () => {
            const res = await request(app).get('/sendNoWait');
            expect(res.status).toBe(200);
            expect(res.body.service).toBe('C');
        });

        test('should forward /queryIP to Service C', async () => {
            const res = await request(app).get('/queryIP');
            expect(res.status).toBe(200);
            expect(res.body.service).toBe('C');
        });

        test('should return 404 for /ping (not supported)', async () => {
            const res = await request(app).get('/ping');
            expect(res.status).toBe(404);
        });

        test('should return 404 for /renewCert (not supported)', async () => {
            const res = await request(app).get('/renewCert');
            expect(res.status).toBe(404);
        });
    });

    describe('Mode 1', () => {
        let app;
        beforeAll(() => {
            app = getApp(1);
        });

        test('should forward /sendAndWait to Service E', async () => {
            const res = await request(app).get('/sendAndWait');
            expect(res.status).toBe(200);
            expect(res.body.service).toBe('E');
        });

        test('should forward /ping to Service E', async () => {
            const res = await request(app).get('/ping');
            expect(res.status).toBe(200);
            expect(res.body.service).toBe('E');
        });

        test('should forward /renewCert to Service E', async () => {
            const res = await request(app).get('/renewCert');
            expect(res.status).toBe(200);
            expect(res.body.service).toBe('E');
        });

        test('should forward /queryIP to Service D', async () => {
            const res = await request(app).get('/queryIP');
            expect(res.status).toBe(200);
            expect(res.body.service).toBe('D');
        });

        test('should forward /doAuth to Service D', async () => {
            const res = await request(app).post('/doAuth');
            expect(res.status).toBe(200);
            expect(res.body.service).toBe('D');
        });
    });

    describe('Mode 2', () => {
        let app;
        beforeAll(() => {
            app = getApp(2);
        });

        test('should forward /sendAndWait to Service D', async () => {
            const res = await request(app).get('/sendAndWait');
            expect(res.status).toBe(200);
            expect(res.body.service).toBe('D');
        });

        test('should forward /queryIP to Service D', async () => {
            const res = await request(app).get('/queryIP');
            expect(res.status).toBe(200);
            expect(res.body.service).toBe('D');
        });

        test('should forward /doAuth to Service D', async () => {
            const res = await request(app).post('/doAuth');
            expect(res.status).toBe(200);
            expect(res.body.service).toBe('D');
        });

        test('should return 404 for /ping (undefined behavior -> 404)', async () => {
            const res = await request(app).get('/ping');
            expect(res.status).toBe(404);
        });

        test('should return 404 for /renewCert (undefined behavior -> 404)', async () => {
            const res = await request(app).get('/renewCert');
            expect(res.status).toBe(404);
        });
    });
});
