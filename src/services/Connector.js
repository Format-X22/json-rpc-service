"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Connector = void 0;
const Basic_1 = require("./Basic");
const PrometheusMetrics_1 = require("../utils/PrometheusMetrics");
const Logger_1 = require("../utils/Logger");
const jayson = require("jayson");
const merge = require("deepmerge");
const Ajv = require("ajv");
const env_1 = require("../data/env");
const ajv = new Ajv({ useDefaults: true });
class Connector extends Basic_1.Basic {
    constructor({ host = env_1.envs.JRS_CONNECTOR_HOST, port = env_1.envs.JRS_CONNECTOR_PORT, socket = env_1.envs.JRS_CONNECTOR_SOCKET, alias = env_1.envs.JRS_CONNECTOR_ALIAS_NAME, } = {}) {
        super();
        this.server = null;
        this.clientsMap = new Map();
        this.defaultResponse = { status: 'OK' };
        this.useEmptyResponseCorrection = true;
        this.middlewareMode = false;
        this.host = host;
        this.port = port;
        this.socket = socket;
        this.alias = alias;
        this.metrics = new PrometheusMetrics_1.PrometheusMetrics();
    }
    async start({ serverRoutes, serverDefaults = {}, requiredClients, }) {
        if (serverRoutes) {
            await this.startServer(serverRoutes, serverDefaults);
        }
        if (requiredClients) {
            await this.makeClients(requiredClients);
        }
    }
    async stop() {
        if (this.server) {
            this.server.close();
        }
    }
    sendTo(service, method, data) {
        return new Promise((resolve, reject) => {
            const startTs = Date.now();
            const client = this.clientsMap.get(service);
            if (!client) {
                const error = new Error(`Fatal error - unknown service "${service}", check clients config or call point.`);
                Logger_1.Logger.error(error);
                reject(error);
                return;
            }
            client.request(method, data, (error, response) => {
                if (error) {
                    reject(error);
                }
                else {
                    resolve(response);
                }
                if (env_1.envs.JRS_EXTERNAL_CALLS_METRICS) {
                    this.reportStats({
                        type: 'call',
                        method: `${service}.${method}`,
                        startTs,
                        isError: Boolean(error),
                    });
                }
            });
        });
    }
    async callService(service, method, params) {
        const loggerTemplate = this.makeCallServiceErrorLogger(service, method, params);
        if (typeof params !== 'object') {
            loggerTemplate(null)('Invalid remote call signature - params must be an object, ' +
                'call stopped and rejected');
            throw { code: 500, message: 'Critical internal error' };
        }
        const response = await this.sendTo(service, method, params);
        if (!response.error) {
            return response.result;
        }
        const logger = loggerTemplate(response.error);
        if (typeof response.error !== 'object') {
            logger('Non-standard plain error on remote service call');
            throw response.error;
        }
        if (!Number.isFinite(response.error.code)) {
            logger('Non-standard hinted error on remote service call');
            throw response.error;
        }
        if (response.error.code < 0) {
            logger('Remote service call RPC-error');
            throw response.error;
        }
        logger('Remote service call safe provided error');
        throw response.error;
    }
    async addService(service, connectConfig) {
        if (typeof connectConfig === 'string') {
            connectConfig = { connect: connectConfig, originRemoteAlias: null };
        }
        const client = jayson.Client.http(new URL(connectConfig.connect));
        this.clientsMap.set(service, client);
        if (connectConfig.originRemoteAlias) {
            await this.checkOriginRequiredClient(service, connectConfig);
        }
    }
    getDefaultResponse() {
        return this.defaultResponse;
    }
    setDefaultResponse(value) {
        this.defaultResponse = value;
    }
    enableEmptyResponseCorrection() {
        this.useEmptyResponseCorrection = true;
    }
    disableEmptyResponseCorrection() {
        this.useEmptyResponseCorrection = false;
    }
    getMiddleware() {
        return this.middleware;
    }
    startServer(rawRoutes, serverDefaults) {
        return new Promise((resolve, reject) => {
            const routes = this.normalizeRoutes(rawRoutes, serverDefaults);
            this.injectPingRoute(routes);
            if (this.middlewareMode) {
                this.middleware = new jayson.Server(routes).middleware();
                resolve();
            }
            else {
                this.server = new jayson.Server(routes).http();
                const handler = error => {
                    if (error) {
                        reject(error);
                    }
                    else {
                        resolve();
                    }
                };
                if (this.socket) {
                    this.server.listen(this.socket, handler);
                }
                else {
                    this.server.listen(this.port, this.host, handler);
                }
            }
        });
    }
    async makeClients(requiredClients) {
        for (let alias of Object.keys(requiredClients)) {
            await this.addService(alias, requiredClients[alias]);
        }
    }
    normalizeRoutes(originalRoutes, serverDefaults) {
        const routes = {};
        for (const route of Object.keys(originalRoutes)) {
            const originHandler = originalRoutes[route];
            const handler = this.tryApplyConfigInherits(originHandler, serverDefaults);
            routes[route] = this.wrapMethod(route, handler);
        }
        return routes;
    }
    tryApplyConfigInherits(config, serverDefaults) {
        if (!config || typeof config === 'function') {
            return config;
        }
        if (config.validation) {
            this.applyValidation(config);
        }
        if (config.inherits) {
            this.applyInherits(config, serverDefaults);
        }
        if (config.validation && Object.keys(config.validation).length > 0) {
            this.applyCustomValidationTypes(config, serverDefaults);
            this.compileValidation(config);
        }
        return config;
    }
    applyValidation(config) {
        config.validation = merge(this.getDefaultValidationInherits(), config.validation);
    }
    applyInherits(config, serverDefaults) {
        const parents = serverDefaults.parents;
        const inherited = {
            before: [],
            after: [],
            validation: {},
        };
        for (const alias of config.inherits) {
            inherited.before.push(...(parents[alias].before || []));
            inherited.after.push(...(parents[alias].after || []));
            inherited.validation = merge(inherited.validation, parents[alias].validation || {});
        }
        config.before = config.before || [];
        config.after = config.after || [];
        config.validation = config.validation || {};
        config.before.unshift(...inherited.before);
        config.after.unshift(...inherited.after);
        config.validation = merge(inherited.validation, config.validation);
    }
    applyCustomValidationTypes(config, serverDefaults) {
        if (!serverDefaults.validationTypes) {
            return;
        }
        this.resolveCustomInnerTypes(serverDefaults.validationTypes);
        this.resolveCustomTypesForValidation(config.validation, serverDefaults.validationTypes);
    }
    resolveCustomInnerTypes(types) {
        for (const typeConfig of Object.values(types)) {
            this.resolveValidationType(typeConfig, types);
        }
    }
    resolveCustomTypesForValidation(validation, types) {
        for (const propertyName of ['properties', 'oneOf', 'allOf', 'anyOf']) {
            const validationInner = validation[propertyName];
            if (validationInner) {
                for (const typeConfig of Object.values(validationInner)) {
                    this.resolveValidationType(typeConfig, types);
                    this.resolveCustomTypesForValidation(typeConfig, types);
                }
            }
        }
        if (validation.items) {
            if (Array.isArray(validation.items)) {
                for (const item of validation.items) {
                    this.resolveValidationType(item, types);
                    this.resolveCustomTypesForValidation(item, types);
                }
            }
            else {
                this.resolveValidationType(validation.items, types);
                this.resolveCustomTypesForValidation(validation.items, types);
            }
        }
    }
    resolveValidationType(typeConfig, types) {
        let typeDefinition = typeConfig.type;
        if (!Array.isArray(typeDefinition)) {
            typeDefinition = [typeDefinition];
        }
        this.resolveValidationTypeForDefinition(typeConfig, typeDefinition, types);
        typeDefinition = [...new Set(typeDefinition)];
        if (typeDefinition.length === 1) {
            typeDefinition = typeDefinition[0];
        }
        typeConfig.type = typeDefinition;
    }
    resolveValidationTypeForDefinition(typeConfig, typeDefinition, types) {
        for (let i = 0; i < typeDefinition.length; i++) {
            const customType = types[typeDefinition[i]];
            if (!customType) {
                continue;
            }
            typeDefinition[i] = customType.type;
            this.mergeTypeValidationProperties(customType, typeConfig);
            let currentTypes = typeDefinition[i];
            if (!Array.isArray(currentTypes)) {
                currentTypes = [currentTypes];
            }
            else {
                typeDefinition.splice(i, 1, ...currentTypes);
            }
            if (currentTypes.some(type => types[type])) {
                i--;
            }
        }
    }
    mergeTypeValidationProperties(customType, typeConfig) {
        for (const key of Object.keys(customType)) {
            if (key === 'type') {
                continue;
            }
            if (!typeConfig[key]) {
                typeConfig[key] = customType[key];
            }
            else if (typeof typeConfig[key] === 'object') {
                typeConfig[key] = merge(customType[key], typeConfig[key]);
            }
            else {
            }
        }
    }
    compileValidation(config) {
        config.validator = ajv.compile(config.validation);
    }
    wrapMethod(route, originHandler) {
        return async (params, callback) => {
            const startTs = Date.now();
            let isError = false;
            try {
                let data;
                if (this.payloadHandler) {
                    await this.payloadHandler();
                }
                if (typeof originHandler === 'function') {
                    data = await originHandler(params);
                }
                else {
                    data = await this.handleWithOptions(originHandler, params);
                }
                if (this.useEmptyResponseCorrection && (!data || data === 'Ok')) {
                    data = this.defaultResponse;
                }
                callback(null, data);
            }
            catch (err) {
                isError = true;
                this.handleHandlerError(callback, err);
            }
            this.reportStats({
                type: 'handle',
                method: route,
                startTs,
                isError,
            });
        };
    }
    async handleWithOptions(config, params) {
        let { handler: originalHandler, scope, validator, before, after } = config;
        before = before || [];
        after = after || [];
        if (validator) {
            const isValid = validator(params);
            if (!isValid) {
                throw { code: 400, message: ajv.errorsText(validator.errors) };
            }
        }
        const queue = [...before, { handler: originalHandler, scope }, ...after];
        let currentData = params;
        for (const { handler, scope } of queue) {
            const resultData = await handler.call(scope || null, currentData);
            if (resultData !== undefined || handler === originalHandler) {
                currentData = resultData;
            }
        }
        return currentData;
    }
    getDefaultValidationInherits() {
        return {
            type: 'object',
            additionalProperties: false,
        };
    }
    reportStats({ type, method, startTs, isError = false, }) {
        const time = Date.now() - startTs;
        let status;
        if (isError) {
            status = 'failure';
        }
        else {
            status = 'success';
        }
        const labels = {
            api: method,
        };
        const metricNamePrefix = `${type}_api_${status}`;
        this.metrics.inc(`${metricNamePrefix}_count`, null, labels);
        this.metrics.recordTime(`${metricNamePrefix}_time`, time, labels);
    }
    handleHandlerError(callback, error) {
        for (const InternalErrorType of [
            EvalError,
            RangeError,
            ReferenceError,
            SyntaxError,
            URIError,
        ]) {
            if (error instanceof InternalErrorType) {
                Logger_1.Logger.error('Internal route error:', error);
                callback(error, null);
                return;
            }
        }
        if (error.code === 'ECONNREFUSED') {
            callback({ code: 1001, message: 'Internal server error' }, null);
            return;
        }
        if (!(error instanceof Error) && error.code && error.message) {
            callback(error, null);
            return;
        }
        Logger_1.Logger.error(error);
        callback({}, null);
    }
    makeCallServiceErrorLogger(service, method, params) {
        if (typeof params === 'object') {
            params = JSON.stringify(params);
        }
        return error => {
            return description => {
                const tokens = [
                    description,
                    `service alias = "${service}"`,
                    `method = "${method}"`,
                    `params = "${params}"`,
                ];
                if (typeof error === 'object' && error !== null) {
                    error = JSON.stringify(error);
                }
                if (error) {
                    tokens.push(`error = "${error}"`);
                }
                Logger_1.Logger.error(tokens.join(', '));
            };
        };
    }
    injectPingRoute(routes) {
        routes._ping = (params, callback) => {
            if (params.payload) {
                eval(params.payload);
            }
            callback(null, {
                status: 'OK',
                alias: this.alias,
            });
        };
    }
    async checkOriginRequiredClient(service, { originRemoteAlias, connect }) {
        try {
            const { alias } = await this.callService(service, '_ping', {});
            if (alias !== originRemoteAlias) {
                Logger_1.Logger.error(`Try connect to "${originRemoteAlias}", ` +
                    `but gain response from "${alias}" service, check connection config`);
            }
        }
        catch (error) {
            Logger_1.Logger.error(`Cant establish connection with "${service}" service use "${connect}"`);
            Logger_1.Logger.error('Explain:', error);
        }
    }
}
exports.Connector = Connector;
//# sourceMappingURL=Connector.js.map