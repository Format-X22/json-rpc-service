import { Basic } from './Basic';
import { PrometheusMetrics } from '../utils/PrometheusMetrics';
import { MongoDB } from './MongoDB';
import { Logger } from '../utils/Logger';

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
export class BasicMain extends Basic {
    private startMongoBeforeBootFlag = false;
    private mongoDbForceConnectString: string = null;
    private mongoDbOptions: Record<string, any> = {};
    private metrics: PrometheusMetrics;
    private mongoDb: MongoDB;

    constructor(env = null) {
        super();

        if (env) {
            this.printEnvBasedConfig(env);
        }

        this.stopOnExit();
        this.throwOnUnhandledPromiseRejection();

        this.startMongoBeforeBootFlag = false;
        this.mongoDbForceConnectString = null;
        this.mongoDbOptions = {};
        this.metrics = new PrometheusMetrics();
    }

    async start(): Promise<void> {
        await this.tryStartDbBeforeBoot();
        await this.boot();
        await this.startNested();
        this.tryIncludeDbToNested();

        this.metrics.inc('service_start');
    }

    async stop(): Promise<void> {
        await this.stopNested();

        this.metrics.inc('service_stop');
        process.exit(0);
    }

    /**
     * Will connect and start the work service
     * with the MongoDB database before running the boot method.
     * Immediately saves the MongoDB service instance inside the class.
     * @param [forceConnectString] Connection string,
     * optional.
     * @param [options] Connection settings.
     */
    startMongoBeforeBoot(forceConnectString: string, options: Record<string, any>) {
        this.mongoDb = new MongoDB();
        this.startMongoBeforeBootFlag = true;
        this.mongoDbForceConnectString = forceConnectString;
        this.mongoDbOptions = options;
    }

    /**
     * Get an instance of the MongoDB service, if there is one.
     * The instance will not be started before the start of this service.
     * @return Instance.
     */
    getMongoDbInstance(): MongoDB {
        return this.mongoDb || null;
    }

    private tryIncludeDbToNested(): void {
        if (this.startMongoBeforeBootFlag) {
            this.nestedServices.unshift(this.mongoDb);
        }
    }

    private async tryStartDbBeforeBoot(): Promise<void> {
        if (this.startMongoBeforeBootFlag) {
            Logger.info(`Start MongoDB...`);
            await this.mongoDb.start(this.mongoDbForceConnectString, this.mongoDbOptions);
            Logger.info(`The MongoDB done!`);

            this.tryExcludeDbFromNested(MongoDB);
        }
    }

    private tryExcludeDbFromNested(Class) {
        const name = Class.name;

        this.nestedServices = this.nestedServices.filter(service => {
            if (service instanceof Class) {
                Logger.warn(`Exclude ${name} from nested services - start${name}BeforeBoot used`);
                return false;
            } else {
                return true;
            }
        });
    }
}
