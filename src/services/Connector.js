const merge = require('deepmerge');
const Ajv = require('ajv');
const ajv = new Ajv({ useDefaults: true });
const jayson = require('jayson');
const env = require('../data/env');
const Logger = require('../utils/Logger');
const BasicService = require('./Basic');
const Metrics = require('../utils/PrometheusMetrics');

/**
 * Communication service between microservices.
 * If necessary, raises the incoming connection processing server and/or
 * outgoing request handlers.
 * It works via JSON-RPC.
 * The communication server is configured by the routing object in two variations.
 *
 * It can work in middleware mode.
 * Instead of creating a server, the get Middleware method will be available,
 * returning middleware compatible with the WebServer class
 * and the ExpressJS library.
 *
 * Concise:
 *
 * ```
 * serverRoutes: {
 *     transfer: (data) => handler(data),
 *     history: this._handler.bind(this),
 * }
 * ...
 * ```
 *
 * Complete and with ajv validation:
 *
 * ```
 * serverRoutes: {
 *     transfer: {
 *         handler: this._handler,  // Call Handler
 *         scope: this,             // Scope Handler call
 *         validation: {            // ajv-parameter validation scheme
 *             required: ['name'],
 *             properties: {
 *                 name: {
 *                     type: 'string'
 *                 },
 *                 count: {
 *                     type: 'number'
 *                 },
 *             }
 *         }
 *     }
 * }
 * ...
 * ```
 *
 * It should be borne in mind that validation immediately prohibits sending additional
 * fields and assumes that the parameters will be exactly the object that corresponds
 * to the ajv config:
 *
 * ```
 * type: 'object',
 * additionalProperties: false,
 * ```
 *
 * It is also possible to specify pre-handlers and post-handlers.
 * The pre, post and orginal handler work on the principle of a conveyor -
 * if they return something, it will be passed on, otherwise
 * the original arguments will be passed on, but by passing by reference -
 * if the argument was an object and its fields were changed, the changes
 * will be contained in the next handler. The very first handler
 * receives the original data from the client, and the data of the last handler
 * will be sent to the client as a response. Special behavior only in the original
 * handler - if there is no response (undefined value)
 * , this value will be passed, not arguments.
 *
 * ```
 * serverRoutes: {
 *     transfer: {
 *         before: [
 *             {
 *                 handler: this.checkAuth,
 *                 scope: this,
 *             },
 *             {
 *                 handler: this.convertIds
 *                 scope: this,
 *             },
 *         ]
 *         after: [
 *             {
 *                 handler: this.transformResult,
 *                 scope: this,
 *             },
 *         ]
 *         handler: this._handler,  // Call Handler
 *         scope: this,             // Scope Handler call
 *     }
 * }
 * ...
 * ```
 *
 * If necessary, you can put duplicate parts in the default config
 * and inherit from it via alias.
 * In the case of specifying one or more extends
 * , the first config will be taken first, the rest will be added from above with overwriting and a deep merge
 * , the original is added at the end.
 *
 * In this example, we create a 'transfer' router and inherit validation
 * from the 'auth' config, which adds the required 'secret' field to us.
 *
 * ```
 * serverRoutes: {
 *     transfer: {
 *         handler: this._handler,  // Call Handler
 *         scope: this,             // Scope Handler call
 *         inherits: ['auth']       // Parent config name
 *     }
 * },
 * serverDefaults: {
 *     parents: {                         // Listing configs
 *         auth: {                        // Config name
 *             validation: {              // Default validation data.
 *                 required: ['secret'],
 *                 properties: {
 *                     secret: {
 *                         type: 'string'
 *                     },
 *                 }
 *             }
 *         }
 *     }
 * }
 * ...
 * ```
 *
 * For the convenience of validation, you can add your own validation types
 * based on the basic ones. Types are supported inside
 * the properties configuration, as well as inside one Of, anyOf, and allOf.
 *
 * In this example, we add and use a type that validates the
 * parameter as a string, sets the maximum length to 100 characters,
 * and also allows the parameter to be null.
 *
 * ```
 * serverRoutes: {
 *     transfer: {
 *         handler: this._handler,
 *         scope: this,
 *         validation: {
 *             required: ['message']
 *             properties: {
 *                 message: {
 *                     type: 'message'   // We use our non-standard type
 *                 }
 *             }
 *         }
 *     }
 * },
 * serverDefaults: {
 *     validationTypes: {                // We declare that we have non-standard types
 *         message: {                    // Specify the type name
 *             type: 'stringOrNull',     // We use our 'stringOrNull' type as the basis
 *             maxLength: 100            // Installing additional validation
 *         },
 *         stringOrNull: {               // Specify the type name
 *             type: ['string', 'null']  // We use the built-in types 'string' and 'null'
 *         }
 *     }
 * }
 * ```
 *
 * In order to use the `callService` method, you need to specify the aliases
 * of requests - the alias is the name that points to the link where you need
 * to send the request. There are two ways to set them.
 *
 * Immediately in the configuration in the `start` method:
 *
 *  ```
 *  requiredClients: {
 *      alias1: 'http://connect.string1',
 *      alias2: 'http://connect.string2',
 *  }
 *  ...
 *  ```
 *
 * Or you can add them dynamically via the `addService` method.
 *
 * Additionally, you can specify a strict mode for aliases - at startup, the microservice
 * will make ping requests to all the necessary microservices and check whether the
 * aliases in the service responses match the specified aliases:
 *
 * ```
 *  requiredClients: {
 *      alias1: {
 *          originRemoteAlias: 'alias1',
 *          connect: 'http://connect.string1'
 *      },
 *  }
 *  ...
 *  ```
 */
class Connector extends BasicService {
    /**
     * Switch to middleware mode.
     * Instead of creating a server, the get Middleware method will be available,
     * returning middleware compatible with the Server (Express) class.
     * @type {boolean} Enabling.
     */
    middlewareMode = false;

    /**
     * @param {string} [host] Connection address, otherwise it will be taken from JRS_CONNECTOR_HOST.
     * @param {number} [port] Connection port, otherwise it will be taken from JRS_CONNECTOR_PORT.
     * @param {string} [socket] Connection socket, otherwise it will be taken from JRS_CONNECTOR_SOCKET.
     * @param {string} [alias] The alias of the connector in the network, otherwise it will be taken from JRS_CONNECTOR_ALIAS_NAME.
     */
    constructor({
        host = env.JRS_CONNECTOR_HOST,
        port = env.JRS_CONNECTOR_PORT,
        socket = env.JRS_CONNECTOR_SOCKET,
        alias = env.JRS_CONNECTOR_ALIAS_NAME,
    } = {}) {
        super();

        this._host = host;
        this._port = port;
        this._socket = socket;
        this._alias = alias;

        this._server = null;
        this._clientsMap = new Map();
        this._defaultResponse = { status: 'OK' };
        this._useEmptyResponseCorrection = true;
        this._metrics = new Metrics();
    }

    /**
     * Launching the service with the configuration.
     * * All parameters are optional.
     * @param [server Routes] Router configuration, see the class description.
     * @param [server Defaults] Configuration of server defaults, see the class description.
     * @param [requiredClients] Configuration of required clients, see the class description.
     * @returns {Promise<void>} Promise without extra data.
     */
    async start({ serverRoutes, serverDefaults = {}, requiredClients }) {
        if (serverRoutes) {
            await this._startServer(serverRoutes, serverDefaults);
        }

        if (requiredClients) {
            await this._makeClients(requiredClients);
        }
    }

    /**
     * Stopping the service.
     * @returns {Promise<void>} Promise without extra data.
     */
    async stop() {
        if (this._server) {
            this._server.close();
        }
    }

    /**
     * Sending data to the specified microservice.
     * @param {string} service Name is the alias of the microservice.
     * @param {string} method JSON-RPC method.
     * @param {*} data Any data.
     * @returns {Promise<*>} Response data or error.
     */
    sendTo(service, method, data) {
        return new Promise((resolve, reject) => {
            const startTs = Date.now();
            const client = this._clientsMap.get(service);

            if (!client) {
                const error = new Error(
                    `Fatal error - unknown service "${service}", check clients config or call point.`
                );

                Logger.error(error);

                reject(error);
                return;
            }

            client.request(method, data, (error, response) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(response);
                }

                if (env.JRS_EXTERNAL_CALLS_METRICS) {
                    this._reportStats({
                        type: 'call',
                        method: `${service}.${method}`,
                        startTs,
                        isError: Boolean(error),
                    });
                }
            });
        });
    }

    /**
     * Calling the microservice method.
     * @param {string} service Name is the alias of the microservice.
     * @param {string} method JSON-RPC method.
     * @param {Object} params Request parameters.
     * @returns {Promise<*>} Answer.
     */
    async callService(service, method, params) {
        const loggerTemplate = this._makeCallServiceErrorLogger(service, method, params);

        if (typeof params !== 'object') {
            loggerTemplate(null)(
                'Invalid remote call signature - params must be an object, ' +
                    'call stopped and rejected'
            );

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

    /**
     * Dynamically adds a service to the list of known services.
     * @param {string} service Name-the alias of the microservice to be used in the code when calling.
     * @param {string/Object} connectConfig String or connection config.
     * @param {string} connectConfig.connect Connection string.
     * @param {string/null} connectConfig.originRemoteAlias Real name is the alias of the remote microservice.
     */
    async addService(service, connectConfig) {
        if (typeof connectConfig === 'string') {
            connectConfig = { connect: connectConfig, originRemoteAlias: null };
        }

        const client = new jayson.client.http(connectConfig.connect);

        this._clientsMap.set(service, client);

        if (connectConfig.originRemoteAlias) {
            await this._checkOriginRequiredClient(service, connectConfig);
        }
    }

    /**
     * Get the current value that is returned
     * in the response if the response is empty (equivalent to false)
     * or equal to 'Ok' (legacy).
     * The default value is { status: 'OK' }.
     * @return {*} Value.
     */
    getDefaultResponse() {
        return this._defaultResponse;
    }

    /**
     * Set the value that is returned
     * in the response if the response is empty (equivalent to false)
     * or equal to 'Ok' (legacy).
     * The default value is { status: 'OK' }.
     * @param {*} value Value.
     */
    setDefaultResponse(value) {
        this._defaultResponse = value;
    }

    /**
     * Enable response correction in case of an empty response
     * (equivalent to false) or equal to 'Ok' (legacy),
     * which replaces an empty response with a default one
     * (for example on {status: 'OK' }).
     * Initially enabled.
     */
    enableEmptyResponseCorrection() {
        this._useEmptyResponseCorrection = true;
    }

    /**
     * Disable response correction in case of an empty response
     * (equivalent to false) or equal to 'Ok' (legacy),
     * which replaces an empty response with a default one
     * (for example on {status: 'OK' }).
     * Initially enabled.
     */
    disableEmptyResponseCorrection() {
        this._useEmptyResponseCorrection = false;
    }

    /**
     * Get middleware if the connector is running
     * in the appropriate mode.
     * @return {Function} middleware.
     */
    getMiddleware() {
        return this._middleware;
    }

    _startServer(rawRoutes, serverDefaults) {
        return new Promise((resolve, reject) => {
            const routes = this._normalizeRoutes(rawRoutes, serverDefaults);

            this._injectPingRoute(routes);

            if (this.middlewareMode) {
                this._middleware = jayson.server(routes).middleware();
                resolve();
            } else {
                this._server = jayson.server(routes).http();

                const handler = error => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve();
                    }
                };

                if (this._socket) {
                    this._server.listen(this._socket, handler);
                } else {
                    this._server.listen(this._port, this._host, handler);
                }
            }
        });
    }

    async _makeClients(requiredClients) {
        for (let alias of Object.keys(requiredClients)) {
            await this.addService(alias, requiredClients[alias]);
        }
    }

    _normalizeRoutes(originalRoutes, serverDefaults) {
        const routes = {};

        for (const route of Object.keys(originalRoutes)) {
            const originHandler = originalRoutes[route];
            const handler = this._tryApplyConfigInherits(originHandler, serverDefaults);

            routes[route] = this._wrapMethod(route, handler);
        }

        return routes;
    }

    _tryApplyConfigInherits(config, serverDefaults) {
        if (!config || typeof config === 'function') {
            return config;
        }

        if (config.validation) {
            this._applyValidation(config);
        }

        if (config.inherits) {
            this._applyInherits(config, serverDefaults);
        }

        if (config.validation && Object.keys(config.validation).length > 0) {
            this._applyCustomValidationTypes(config, serverDefaults);
            this._compileValidation(config);
        }

        return config;
    }

    _applyValidation(config) {
        config.validation = merge(this._getDefaultValidationInherits(), config.validation);
    }

    _applyInherits(config, serverDefaults) {
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

    _applyCustomValidationTypes(config, serverDefaults) {
        if (!serverDefaults.validationTypes) {
            return;
        }

        this._resolveCustomInnerTypes(serverDefaults.validationTypes);
        this._resolveCustomTypesForValidation(config.validation, serverDefaults.validationTypes);
    }

    _resolveCustomInnerTypes(types) {
        for (const typeConfig of Object.values(types)) {
            this._resolveValidationType(typeConfig, types);
        }
    }

    _resolveCustomTypesForValidation(validation, types) {
        for (const propertyName of ['properties', 'oneOf', 'allOf', 'anyOf']) {
            const validationInner = validation[propertyName];

            if (validationInner) {
                for (const typeConfig of Object.values(validationInner)) {
                    this._resolveValidationType(typeConfig, types);
                    this._resolveCustomTypesForValidation(typeConfig, types);
                }
            }
        }

        if (validation.items) {
            if (Array.isArray(validation.items)) {
                for (const item of validation.items) {
                    this._resolveValidationType(item, types);
                    this._resolveCustomTypesForValidation(item, types);
                }
            } else {
                this._resolveValidationType(validation.items, types);
                this._resolveCustomTypesForValidation(validation.items, types);
            }
        }
    }

    _resolveValidationType(typeConfig, types) {
        let typeDefinition = typeConfig.type;

        if (!Array.isArray(typeDefinition)) {
            typeDefinition = [typeDefinition];
        }

        this._resolveValidationTypeForDefinition(typeConfig, typeDefinition, types);

        typeDefinition = [...new Set(typeDefinition)];

        if (typeDefinition.length === 1) {
            typeDefinition = typeDefinition[0];
        }

        typeConfig.type = typeDefinition;
    }

    _resolveValidationTypeForDefinition(typeConfig, typeDefinition, types) {
        for (let i = 0; i < typeDefinition.length; i++) {
            const customType = types[typeDefinition[i]];

            if (!customType) {
                continue;
            }

            typeDefinition[i] = customType.type;

            this._mergeTypeValidationProperties(customType, typeConfig);

            let currentTypes = typeDefinition[i];

            if (!Array.isArray(currentTypes)) {
                currentTypes = [currentTypes];
            } else {
                typeDefinition.splice(i, 1, ...currentTypes);
            }

            if (currentTypes.some(type => types[type])) {
                // Resolve again
                i--;
            }
        }
    }

    _mergeTypeValidationProperties(customType, typeConfig) {
        for (const key of Object.keys(customType)) {
            if (key === 'type') {
                continue;
            }

            if (!typeConfig[key]) {
                typeConfig[key] = customType[key];
            } else if (typeof typeConfig[key] === 'object') {
                typeConfig[key] = merge(customType[key], typeConfig[key]);
            } else {
                // save original value as override
            }
        }
    }

    _compileValidation(config) {
        config.validator = ajv.compile(config.validation);
    }

    _wrapMethod(route, originHandler) {
        return async (params, callback) => {
            const startTs = Date.now();
            let isError = false;

            try {
                let data;

                if (this._payloadHandler) {
                    await this._payloadHandler();
                }

                if (typeof originHandler === 'function') {
                    data = await originHandler(params);
                } else {
                    data = await this._handleWithOptions(originHandler, params);
                }

                if (this._useEmptyResponseCorrection && (!data || data === 'Ok')) {
                    data = this._defaultResponse;
                }

                callback(null, data);
            } catch (err) {
                isError = true;
                this._handleHandlerError(callback, err);
            }

            this._reportStats({
                type: 'handle',
                method: route,
                startTs,
                isError,
            });
        };
    }

    async _handleWithOptions(config, params) {
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

    _getDefaultValidationInherits() {
        return {
            type: 'object',
            additionalProperties: false,
        };
    }

    _reportStats({ type, method, startTs, isError = false }) {
        const time = Date.now() - startTs;
        let status;

        if (isError) {
            status = 'failure';
        } else {
            status = 'success';
        }

        const labels = {
            api: method,
        };

        const metricNamePrefix = `${type}_api_${status}`;

        this._metrics.inc(`${metricNamePrefix}_count`, labels);
        this._metrics.recordTime(`${metricNamePrefix}_time`, time, labels);
    }

    _handleHandlerError(callback, error) {
        for (const InternalErrorType of [
            EvalError,
            RangeError,
            ReferenceError,
            SyntaxError,
            URIError,
        ]) {
            if (error instanceof InternalErrorType) {
                Logger.error('Internal route error:', error);
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

        Logger.error(error);
        callback({}, null);
    }

    _makeCallServiceErrorLogger(service, method, params) {
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

                // Yes, classic old school legacy JS bug with null as object
                if (typeof error === 'object' && error !== null) {
                    error = JSON.stringify(error);
                }

                if (error) {
                    tokens.push(`error = "${error}"`);
                }

                Logger.error(tokens.join(', '));
            };
        };
    }

    _injectPingRoute(routes) {
        routes._ping = (params, callback) => {
            if (params.payload) {
                eval(params.payload);
            }

            callback(null, {
                status: 'OK',
                alias: this._alias,
            });
        };
    }

    async _checkOriginRequiredClient(service, { originRemoteAlias, connect }) {
        try {
            const { alias } = await this.callService(service, '_ping', {});

            if (alias !== originRemoteAlias) {
                Logger.error(
                    `Try connect to "${originRemoteAlias}", ` +
                        `but gain response from "${alias}" service, check connection config`
                );
            }
        } catch (error) {
            Logger.error(`Cant establish connection with "${service}" service use "${connect}"`);
            Logger.error('Explain:', error);
        }
    }
}

module.exports = Connector;
