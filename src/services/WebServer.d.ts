import { Basic } from './Basic';
import { Express } from 'express';
export declare class WebServer extends Basic {
    private host;
    private port;
    private socket;
    private connector;
    private connectorPath;
    private appVal;
    constructor({ staticDir, connector, connectorPath, host, port, socket, bodySizeLimit, }: {
        staticDir?: string;
        connector: any;
        connectorPath?: string;
        host?: string;
        port?: number;
        socket?: string;
        bodySizeLimit?: string;
    });
    get app(): Express;
    start(): Promise<void>;
    stop(): Promise<void>;
}
