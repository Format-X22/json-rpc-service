import { Connector } from './Connector';
import { Basic } from './Basic';
import { Express } from 'express';
import * as express from 'express';
import * as bodyParser from 'body-parser';
import { envs } from '../data/env';
import { Logger } from '../utils/Logger';

/**
 * Wrapper over ExpressJS.
 * Immediately adds body parsing for forms and JSON.
 * Also allows you to immediately set a folder with static files
 * and issue a connector (Connector class) by IP.
 */
export class WebServer extends Basic {
    private host: string;
    private port: number;
    private socket: any;
    private connector: Connector;
    private connectorPath: string;
    private appVal: Express;

    /**
     * @param [static Dir] Folder for static files.
     * @param [connector] Connector instance.
     * @param [connector Path] The connector mounting path.
     * @param [host] Host.
     * @param [port] Port.
     * @param [socket] Unix-socket instead of host/port.
     * @param [bodySizeLimit] The maximum size of the request body.
     */
    constructor({
        staticDir = envs.JRS_SERVER_STATIC_DIR,
        connector,
        connectorPath = envs.JRS_SERVER_CONNECTOR_PATH,
        host = envs.JRS_CONNECTOR_HOST,
        port = envs.JRS_CONNECTOR_PORT,
        socket = envs.JRS_CONNECTOR_SOCKET,
        bodySizeLimit = envs.JRS_SERVER_BODY_SIZE_LIMIT,
    }) {
        super();

        this.host = host;
        this.port = port;
        this.socket = socket;
        this.connector = connector;
        this.connectorPath = connectorPath;

        this.appVal = express();

        if (staticDir) {
            this.app.use(express.static(staticDir));
        }

        this.app.use(bodyParser.urlencoded({ extended: false, limit: bodySizeLimit }));
        this.app.use(bodyParser.json({ limit: bodySizeLimit }));
    }

    /**
     * Express app.
     */
    get app(): Express {
        return this.appVal;
    }

    async start(): Promise<void> {
        if (this.connector) {
            this.app.post(this.connectorPath, this.connector.getMiddleware());
        }

        if (this.socket) {
            await this.app.listen(this.socket, () => {
                Logger.info(`Web server listen socket - ${this.socket}`);
            });
        } else {
            await this.app.listen(this.port, this.host, () => {
                Logger.info(`Web server listen - ${this.host}:${this.port}`);
            });
        }
    }

    async stop(): Promise<void> {
        await this.app.close(() => {
            Logger.info(() => 'Web server stopped');
        });
    }
}

module.exports = WebServer;
