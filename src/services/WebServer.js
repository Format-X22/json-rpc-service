const express = require('express');
const bodyParser = require('body-parser');
const env = require('../data/env');
const BasicService = require('./Basic');
const Logger = require('../utils/Logger');

/**
 * Обертка над ExpressJS.
 * Сразу добавляет парсинг body для форм и JSON.
 * Также позволяет сразу задать папку со статическими файлами
 * и выдать коннектор (класс Connector) по апи.
 */
class WebServer extends BasicService {
    /**
     * @param [staticDir] Папка для статических файлов.
     * @param [connector] Инстанс коннектора.
     * @param [connectorPath] Путь монтирования коннектора.
     * @param [host] Хост.
     * @param [port] Порт.
     * @param [socket] Unix-socket вместо host/port.
     */
    constructor({
        staticDir = env.JRS_SERVER_STATIC_DIR,
        connector,
        connectorPath = env.JRS_SERVER_CONNECTOR_PATH,
        host = env.JRS_CONNECTOR_HOST,
        port = env.JRS_CONNECTOR_PORT,
        socket = env.JRS_CONNECTOR_SOCKET,
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

        this._app.use(bodyParser.urlencoded({ extended: false }));
        this._app.use(bodyParser.json());
    }

    /**
     * Express app.
     * @return {app} Инстанс app.
     */
    get app() {
        return this._app;
    }

    async start() {
        if (this._connector) {
            this._app.post(this._connectorPath, this._connector.getMiddleware());
        }

        if (this._socket) {
            await this._app.listen(() => {
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
