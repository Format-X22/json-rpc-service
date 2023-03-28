const Basic = require('./Basic');
const MongoDB = require('../services/MongoDB');
const Logger = require('../utils/Logger');
const Metrics = require('../utils/PrometheusMetrics');

/**
 * Base class of the main application class.
 * Automatically performs standard procedures
 * start and stop of the microservice received
 * experimentally on other microservices and bots,
 * which removes unnecessary repetitive code.
 * It is only necessary to describe the constructor by placing
 * required services in the nested storage
 * (see addNested). The only nuance
 * is the need to send to the constructor
 * of this StatsD client base class.
 * Additionally, you can send an env object for
 * automatic printing of env variables to the console.
 * The boot method starts automatically at the start,
 * before launching nested services.
 */
class BasicMain extends Basic {
    constructor(env = null) {
        super();

        if (env) {
            this.printEnvBasedConfig(env);
        }

        this.stopOnExit();
        this.throwOnUnhandledPromiseRejection();

        this._startMongoBeforeBoot = false;
        this._mongoDbForceConnectString = null;
        this._mongoDbOptions = {};
        this._metrics = new Metrics();
    }

    async start() {
        await this._tryStartDbBeforeBoot();
        await this.boot();
        await this.startNested();
        this._tryIncludeDbToNested();

        this._metrics.inc('service_start');
    }

    async stop() {
        await this.stopNested();

        this._metrics.inc('service_stop');
        process.exit(0);
    }

    /**
     * Will connect and start the work service
     * with the MongoDB database before running the boot method.
     * Immediately saves the MongoDB service instance inside the class.
     * @param {string/null} [forceConnectString] Connection string,
     * optional.
     * @param {Object} [options] Connection settings.
     */
    startMongoBeforeBoot(forceConnectString, options) {
        this._mongoDb = new MongoDB();
        this._startMongoBeforeBoot = true;
        this._mongoDbForceConnectString = forceConnectString;
        this._mongoDbOptions = options;
    }

    /**
     * Get an instance of the MongoDB service, if there is one.
     * The instance will not be started before the start of this service.
     * @return {MongoDB/null} Instance.
     */
    getMongoDbInstance() {
        return this._mongoDb || null;
    }

    _tryIncludeDbToNested() {
        if (this._startMongoBeforeBoot) {
            this._nestedServices.unshift(this._mongoDb);
        }
    }

    async _tryStartDbBeforeBoot() {
        if (this._startMongoBeforeBoot) {
            Logger.info(`Start MongoDB...`);
            await this._mongoDb.start(this._mongoDbForceConnectString, this._mongoDbOptions);
            Logger.info(`The MongoDB done!`);

            this._tryExcludeDbFromNested(MongoDB);
        }
    }

    _tryExcludeDbFromNested(Class) {
        const name = Class.name;

        this._nestedServices = this._nestedServices.filter(service => {
            if (service instanceof Class) {
                Logger.warn(`Exclude ${name} from nested services - start${name}BeforeBoot used`);
                return false;
            } else {
                return true;
            }
        });
    }
}

module.exports = BasicMain;
