// Описание переменных окружения смотри в Readme.
const env = process.env;

module.exports = {
    JRS_MONGO_CONNECT: env.JRS_MONGO_CONNECT || 'mongodb://mongo/admin',
    JRS_METRICS_HOST: env.JRS_METRICS_HOST || '127.0.0.1',
    JRS_METRICS_PORT: Number(env.JRS_METRICS_PORT) || 9777,
    JRS_CONNECTOR_HOST: env.JRS_CONNECTOR_HOST || '0.0.0.0',
    JRS_CONNECTOR_PORT: Number(env.JRS_CONNECTOR_PORT) || 3000,
    JRS_CONNECTOR_SOCKET: env.JRS_CONNECTOR_SOCKET,
    JRS_EXTERNAL_CALLS_METRICS:
        Boolean(env.JRS_EXTERNAL_CALLS_METRICS) && env.JRS_EXTERNAL_CALLS_METRICS !== 'false',
    JRS_SYSTEM_METRICS: Boolean(env.JRS_SYSTEM_METRICS) && env.JRS_SYSTEM_METRICS !== 'false',
    JRS_SERVER_STATIC_DIR: env.JRS_SERVER_STATIC_DIR || null,
    JRS_SERVER_CONNECTOR_PATH: env.JRS_SERVER_CONNECTOR_PATH || '/',
};
