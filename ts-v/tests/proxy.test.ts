import request from 'supertest';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import { Express } from 'express';

let serviceC: ChildProcess, serviceD: ChildProcess, serviceE: ChildProcess;

// Helper to start mock services
// Using ts-node to run the mock services
const startMock = (file: string): ChildProcess => {
    return spawn('npx', ['ts-node', path.join(__dirname, '../src/mocks', file)], {
        stdio: 'ignore'
    });
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

beforeAll(async () => {
    console.log('Starting Mock Services...');
    serviceC = startMock('serviceC.ts');
    serviceD = startMock('serviceD.ts');
    serviceE = startMock('serviceE.ts');
    // Wait for services to be up (ts-node might take a bit longer)
    await sleep(5000);
    console.log('Mock Services Started.');
}, 10000);

afterAll(() => {
    console.log('Stopping Mock Services...');
    if (serviceC) serviceC.kill();
    if (serviceD) serviceD.kill();
    if (serviceE) serviceE.kill();
});

describe('Proxy Service B Routing Logic', () => {
    
    // Helper to reload app with specific mode
    const getApp = (mode: number): Express => {
        jest.resetModules();
        process.env.PROXY_MODE = mode.toString();
        // We need to re-require config because it reads env vars at top level
        // jest.resetModules() handles this for us
        return require('../src/server').default;
    };

    describe('Mode 0', () => {
        let app: Express;
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
        let app: Express;
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
        let app: Express;
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
