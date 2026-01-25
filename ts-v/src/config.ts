import dotenv from 'dotenv';

dotenv.config();

export interface ServiceConfig {
    url: string;
}

export interface Config {
    mode: number;
    port: number;
    services: {
        C: ServiceConfig;
        D: ServiceConfig;
        E: ServiceConfig;
    };
}

const config: Config = {
    // Mode of operation: 0, 1, or 2
    mode: parseInt(process.env.PROXY_MODE || '0', 10),
    
    // Service B (Proxy) Port
    port: parseInt(process.env.PORT || '3000', 10),

    // Target Services Configuration
    services: {
        C: {
            url: process.env.SERVICE_C_URL || 'http://localhost:3001'
        },
        D: {
            url: process.env.SERVICE_D_URL || 'http://localhost:3002'
        },
        E: {
            url: process.env.SERVICE_E_URL || 'http://localhost:3003'
        }
    }
};

export default config;
