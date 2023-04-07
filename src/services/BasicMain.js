"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BasicMain = void 0;
const Basic_1 = require("./Basic");
const PrometheusMetrics_1 = require("../utils/PrometheusMetrics");
const MongoDB_1 = require("./MongoDB");
const Logger_1 = require("../utils/Logger");
class BasicMain extends Basic_1.Basic {
    constructor(env = null) {
        super();
        this.startMongoBeforeBootFlag = false;
        this.mongoDbForceConnectString = null;
        this.mongoDbOptions = {};
        if (env) {
            this.printEnvBasedConfig(env);
        }
        this.stopOnExit();
        this.throwOnUnhandledPromiseRejection();
        this.startMongoBeforeBootFlag = false;
        this.mongoDbForceConnectString = null;
        this.mongoDbOptions = {};
        this.metrics = new PrometheusMetrics_1.PrometheusMetrics();
    }
    async start() {
        await this.tryStartDbBeforeBoot();
        await this.boot();
        await this.startNested();
        this.tryIncludeDbToNested();
        this.metrics.inc('service_start');
    }
    async stop() {
        await this.stopNested();
        this.metrics.inc('service_stop');
        process.exit(0);
    }
    startMongoBeforeBoot(forceConnectString, options) {
        this.mongoDb = new MongoDB_1.MongoDB();
        this.startMongoBeforeBootFlag = true;
        this.mongoDbForceConnectString = forceConnectString;
        this.mongoDbOptions = options;
    }
    getMongoDbInstance() {
        return this.mongoDb || null;
    }
    tryIncludeDbToNested() {
        if (this.startMongoBeforeBootFlag) {
            this.nestedServices.unshift(this.mongoDb);
        }
    }
    async tryStartDbBeforeBoot() {
        if (this.startMongoBeforeBootFlag) {
            Logger_1.Logger.info(`Start MongoDB...`);
            await this.mongoDb.start(this.mongoDbForceConnectString, this.mongoDbOptions);
            Logger_1.Logger.info(`The MongoDB done!`);
            this.tryExcludeDbFromNested(MongoDB_1.MongoDB);
        }
    }
    tryExcludeDbFromNested(Class) {
        const name = Class.name;
        this.nestedServices = this.nestedServices.filter(service => {
            if (service instanceof Class) {
                Logger_1.Logger.warn(`Exclude ${name} from nested services - start${name}BeforeBoot used`);
                return false;
            }
            else {
                return true;
            }
        });
    }
}
exports.BasicMain = BasicMain;
//# sourceMappingURL=BasicMain.js.map