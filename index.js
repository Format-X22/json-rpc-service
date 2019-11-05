// Export public classes
module.exports = {
    controllers: {
        Basic: require('./src/controllers/Basic'),
    },
    services: {
        Basic: require('./src/services/Basic'),
        BasicMain: require('./src/services/BasicMain'),
        MongoDB: require('./src/services/MongoDB'),
        Connector: require('./src/services/Connector'),
        WebServer: require('./src/services/WebServer'),
    },
    utils: {
        Logger: require('./src/utils/Logger'),
        Template: require('./src/utils/Template'),
        RpcObject: require('./src/utils/RpcObject'),
        Parallel: require('./src/utils/Parallel'),
        ParallelPool: require('./src/utils/ParallelPool'),
        defaultStarter: require('./src/utils/defaultStarter'),
    },
    types: {
        BigNum: require('./src/types/BigNum'),
        MongoBigNum: require('./src/types/MongoBigNum'),
    },
    data: {
        env: require('./src/data/env'),
    },
};
