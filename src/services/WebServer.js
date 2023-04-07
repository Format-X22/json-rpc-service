"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebServer = void 0;
const Basic_1 = require("./Basic");
const express = require("express");
const bodyParser = require("body-parser");
const env_1 = require("../data/env");
const Logger_1 = require("../utils/Logger");
class WebServer extends Basic_1.Basic {
    constructor({ staticDir = env_1.envs.JRS_SERVER_STATIC_DIR, connector, connectorPath = env_1.envs.JRS_SERVER_CONNECTOR_PATH, host = env_1.envs.JRS_CONNECTOR_HOST, port = env_1.envs.JRS_CONNECTOR_PORT, socket = env_1.envs.JRS_CONNECTOR_SOCKET, bodySizeLimit = env_1.envs.JRS_SERVER_BODY_SIZE_LIMIT, }) {
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
    get app() {
        return this.appVal;
    }
    async start() {
        if (this.connector) {
            this.app.post(this.connectorPath, this.connector.getMiddleware());
        }
        if (this.socket) {
            await this.app.listen(this.socket, () => {
                Logger_1.Logger.info(`Web server listen socket - ${this.socket}`);
            });
        }
        else {
            await this.app.listen(this.port, this.host, () => {
                Logger_1.Logger.info(`Web server listen - ${this.host}:${this.port}`);
            });
        }
    }
    async stop() {
        await this.app.close(() => {
            Logger_1.Logger.info(() => 'Web server stopped');
        });
    }
}
exports.WebServer = WebServer;
module.exports = WebServer;
//# sourceMappingURL=WebServer.js.map