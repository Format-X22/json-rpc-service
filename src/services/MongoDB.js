"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoDB = void 0;
const mongoose = require("mongoose");
const Basic_1 = require("./Basic");
const PrometheusMetrics_1 = require("../utils/PrometheusMetrics");
const Logger_1 = require("../utils/Logger");
const env_1 = require("../data/env");
class MongoDB extends Basic_1.Basic {
    constructor() {
        super();
        this.metrics = new PrometheusMetrics_1.PrometheusMetrics();
    }
    static makeModel(name, schemaConfig, optionsConfig = {}) {
        const schema = new mongoose.Schema(schemaConfig, Object.assign({ timestamps: true }, optionsConfig.schema));
        if (optionsConfig.index) {
            for (let indexConfig of optionsConfig.index) {
                schema.index(indexConfig.fields, indexConfig.options);
            }
        }
        return mongoose.model(name, schema);
    }
    static get mongoose() {
        return mongoose;
    }
    static get schemaTypes() {
        return mongoose.Schema.Types;
    }
    static get mongoTypes() {
        return mongoose.Types;
    }
    async start(forceConnectString = null, options = {}) {
        return new Promise(resolve => {
            const connection = mongoose.connection;
            connection.on('error', error => {
                this.metrics.inc('mongo_error');
                Logger_1.Logger.error('MongoDB error:', error);
                process.exit(1);
            });
            connection.once('open', () => {
                Logger_1.Logger.info('MongoDB connection established.');
                resolve();
            });
            mongoose.connect(forceConnectString || env_1.envs.JRS_MONGO_CONNECT, Object.assign({ useNewUrlParser: true }, options));
        });
    }
    async stop() {
        await mongoose.disconnect();
        Logger_1.Logger.info('MongoDB disconnected.');
    }
}
exports.MongoDB = MongoDB;
//# sourceMappingURL=MongoDB.js.map