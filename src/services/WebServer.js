const express = require('express');
const bodyParser = require('body-parser');
const env = require('../data/env');
const BasicService = require('./Basic');
const Logger = require('../utils/Logger');

/**
 * Wrapper over ExpressJS.
 * Immediately adds body parsing for forms and JSON.
 * Also allows you to immediately set a folder with static files
 * and issue a connector (Connector class) by IP.
 */
class WebServer extends BasicService {
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
        staticDir = env.JRS_SERVER_STATIC_DIR,
        connector,
        connectorPath = env.JRS_SERVER_CONNECTOR_PATH,
        host = env.JRS_CONNECTOR_HOST,
        port = env.JRS_CONNECTOR_PORT,
        socket = env.JRS_CONNECTOR_SOCKET,
        bodySizeLimit = env.JRS_SERVER_BODY_SIZE_LIMIT,
    }) {
        super();

        this._host = host;
        this._port = port;
        this._socket = socket;
        this._connector = connector;
        this._connectorPath = connectorPath;

        this._app = express();

        if (staticDir) {
            this._app.use(express.static(staticDir));
        }

        this._app.use(bodyParser.urlencoded({ extended: false, limit: bodySizeLimit }));
        this._app.use(bodyParser.json({ limit: bodySizeLimit }));
    }

    /**
     * Express app.
     * @return {app} The app instance.
     */
    get app() {
        return this._app;
    }

    async start() {
        if (this._connector) {
            this._app.post(this._connectorPath, this._connector.getMiddleware());
        }

        if (this._socket) {
            await this._app.listen(this._socket, () => {
                Logger.info(`Web server listen socket - ${this._socket}`);
            });
        } else {
            await this._app.listen(this._port, this._host, () => {
                Logger.info(`Web server listen - ${this._host}:${this._port}`);
            });
        }
    }

    async stop() {
        await this._app.close(() => {
            Logger.info(() => 'Web server stopped');
        });
    }
}

module.exports = WebServer;
