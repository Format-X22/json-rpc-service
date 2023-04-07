import * as mongoose from 'mongoose';
import { Basic } from './Basic';
import { PrometheusMetrics } from '../utils/PrometheusMetrics';
import { IndexDefinition, IndexOptions, Model, Mongoose } from 'mongoose';
import { Logger } from '../utils/Logger';
import { envs } from '../data/env';

/**
 * MongoDB database interaction service.
 * Contains methods for connecting to the database,
 * as well as a wrapper for creating models of the Mongoose format.Schema.
 */
export class MongoDB extends Basic {
    private metrics: PrometheusMetrics;

    constructor() {
        super();

        this.metrics = new PrometheusMetrics();
    }

    /**
     * Creating a model based on a configuration object.
     * Additionally, the second argument can specify the config,
     * which will be applied to a ready-made scheme,
     * for example composite indexes.
     * The schemas are described in more detail in the Mongoose documentation.
     * @param name The name of the model.
     * @param schemaConfig Schema-config of the model as a simple object.
     * @param [optionsConfig] Config of schema level settings.
     * @param optionsConfig.index
     * Array of index configs consisting of objects with the fields key
     * to indicate the index fields and the options key for additional options.
     * For example {fields: {user: 1, data: 1}, options: {sparse: true}}
     * describes a composite index indicating the omission of null values.
     * The schemas are described in more detail in the Mongoose documentation.
     * @param optionsConfig.schema Additional general settings
     * for Mongoose schema.
     */
    static makeModel(
        name: string,
        schemaConfig: Record<string, any>,
        optionsConfig: {
            index?: Array<{ fields: IndexDefinition; options: IndexOptions }>;
            schema?: any;
        } = {}
    ): Model<any> {
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
     */
    static get mongoose(): Mongoose {
        return mongoose;
    }

    /**
     * Getting the types of schemes needed to denote special
     * types of fields for models.
     * @returns Schema types.
     */
    static get schemaTypes(): any {
        return mongoose.Schema.Types;
    }

    /**
     * Getting a collection of MongoDB data type constructors.
     * @returns Schema types.
     */
    static get mongoTypes(): any {
        return mongoose.Types;
    }

    /**
     * Start, connect to a database based on variables
     * environment, or by an explicitly specified connection string.
     * @param [forceConnectString] Connection String,
     * not necessarily.
     * @param [options] Database connection settings.
     */
    async start(forceConnectString: string = null, options: any = {}): Promise<void> {
        return new Promise(resolve => {
            const connection = mongoose.connection;

            connection.on('error', error => {
                this.metrics.inc('mongo_error');
                Logger.error('MongoDB error:', error);
                process.exit(1);
            });
            connection.once('open', () => {
                Logger.info('MongoDB connection established.');
                resolve();
            });

            mongoose.connect(forceConnectString || envs.JRS_MONGO_CONNECT, {
                useNewUrlParser: true,
                ...options,
            });
        });
    }

    /**
     * Stop, disconnect from the database.
     */
    async stop(): Promise<void> {
        await mongoose.disconnect();
        Logger.info('MongoDB disconnected.');
    }
}
