const mongoose = require('mongoose');
const env = require('../data/env');
const Logger = require('../utils/Logger');
const BasicService = require('./Basic');
const Metrics = require('../utils/PrometheusMetrics');

/**
 * MongoDB database interaction service.
 * Contains methods for connecting to the database,
 * as well as a wrapper for creating models of the Mongoose format.Schema.
 */
class MongoDB extends BasicService {
    constructor(...args) {
        super(...args);

        this._metrics = new Metrics();
    }

    /**
     * Creating a model based on a configuration object.
     * Additionally, the second argument can specify the config,
     * which will be applied to a ready-made scheme,
     * for example composite indexes.
     * The schemas are described in more detail in the Mongoose documentation.
     * @param {string} name The name of the model.
     * @param {Object} schemaConfig Schema-config of the model as a simple object.
     * @param {Object} [optionsConfig] Config of schema level settings.
     * @param {Array<Object,Object>} optionsConfig.index
     * Array of index configs consisting of objects with the fields key
     * to indicate the index fields and the options key for additional options.
     * For example {fields: {user: 1, data: 1}, options: {sparse: true}}
     * describes a composite index indicating the omission of null values.
     * The schemas are described in more detail in the Mongoose documentation.
     * @param {Object} optionsConfig.schema Additional general settings
     * for Mongoose schema.
     * @returns Model.
     */
    static makeModel(name, schemaConfig, optionsConfig = {}) {
        const schema = new mongoose.Schema(
            schemaConfig,
            Object.assign({ timestamps: true }, optionsConfig.schema)
        );

        if (optionsConfig.index) {
            for (let indexConfig of optionsConfig.index) {
                schema.index(indexConfig.fields, indexConfig.options);
            }
        }

        return mongoose.model(name, schema);
    }

    /**
     * Getting the driver object that is used in this class.
     * Required to perform operations directly with the bare mongoose driver
     * @returns Module.
     */
    static get mongoose() {
        return mongoose;
    }

    /**
     * Getting the types of schemes needed to denote special
     * types of fields for models.
     * @returns Schema types.
     */
    static get schemaTypes() {
        return mongoose.Schema.Types;
    }

    /**
     * Getting a collection of MongoDB data type constructors.
     * @returns Schema types.
     */
    static get mongoTypes() {
        return mongoose.Types;
    }

    /**
     * Start, connect to a database based on variables
     * environment, or by an explicitly specified connection string.
     * @param {string/null} [forceConnectString] Connection String,
     * not necessarily.
     * @param {Object} [options] Database connection settings.
     * @returns {Promise<*>} Promise without extra data.
     */
    async start(forceConnectString = null, options = {}) {
        return new Promise(resolve => {
            const connection = mongoose.connection;

            connection.on('error', error => {
                this._metrics.inc('mongo_error');
                Logger.error('MongoDB error:', error);
                process.exit(1);
            });
            connection.once('open', () => {
                Logger.info('MongoDB connection established.');
                resolve();
            });

            mongoose.connect(forceConnectString || env.JRS_MONGO_CONNECT, {
                useNewUrlParser: true,
                ...options,
            });
        });
    }

    /**
     * Stop, disconnect from the database.
     * @returns {Promise<void>} Promise without extra data.
     */
    async stop() {
        await mongoose.disconnect();
        Logger.info('MongoDB disconnected.');
    }
}

module.exports = MongoDB;
