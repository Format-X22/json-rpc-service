import { Basic } from './Basic';
import { Express } from 'express';
export declare class WebServer extends Basic {
    private readonly host;
    private readonly port;
    private readonly socket;
    private readonly connector;
    private readonly connectorPath;
    private readonly appVal;
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
