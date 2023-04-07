import { Basic } from './Basic';
import { PrometheusMetrics } from '../utils/PrometheusMetrics';
import { Logger } from '../utils/Logger';
import * as jayson from 'jayson';
import * as merge from 'deepmerge';
import * as Ajv from 'ajv';
import { envs } from '../data/env';

const ajv = new Ajv({ useDefaults: true });

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
export class Connector extends Basic {
    private host: string;
    private port: number;
    private socket: string;
    private alias: string;
    private server = null;
    private clientsMap: Map<any, any> = new Map();
    private defaultResponse = { status: 'OK' };
    private useEmptyResponseCorrection = true;
    private metrics: PrometheusMetrics;
    private middleware: Function;
    private payloadHandler: Function;

    /**
     * Switch to middleware mode.
     * Instead of creating a server, the get Middleware method will be available,
     * returning middleware compatible with the Server (Express) class.
     */
    middlewareMode = false;

    /**
     * @param [host] Connection address, otherwise it will be taken from JRS_CONNECTOR_HOST.
     * @param [port] Connection port, otherwise it will be taken from JRS_CONNECTOR_PORT.
     * @param [socket] Connection socket, otherwise it will be taken from JRS_CONNECTOR_SOCKET.
     * @param [alias] The alias of the connector in the network, otherwise it will be taken from JRS_CONNECTOR_ALIAS_NAME.
     */
    constructor({
        host = envs.JRS_CONNECTOR_HOST,
        port = envs.JRS_CONNECTOR_PORT,
        socket = envs.JRS_CONNECTOR_SOCKET,
        alias = envs.JRS_CONNECTOR_ALIAS_NAME,
    }: {
        host?: string;
        port?: number;
        socket?: string;
        alias?: string;
    } = {}) {
        super();

        this.host = host;
        this.port = port;
        this.socket = socket;
        this.alias = alias;

        this.metrics = new PrometheusMetrics();
    }

    /**
     * Launching the service with the configuration.
     * * All parameters are optional.
     * @param [server Routes] Router configuration, see the class description.
     * @param [server Defaults] Configuration of server defaults, see the class description.
     * @param [requiredClients] Configuration of required clients, see the class description.
     */
    async start({
        serverRoutes,
        serverDefaults = {},
        requiredClients,
    }: {
        serverRoutes: any;
        serverDefaults: any;
        requiredClients: any;
    }): Promise<void> {
        if (serverRoutes) {
            await this.startServer(serverRoutes, serverDefaults);
        }

        if (requiredClients) {
            await this.makeClients(requiredClients);
        }
    }

    /**
     * Stopping the service.
     */
    async stop(): Promise<void> {
        if (this.server) {
            this.server.close();
        }
    }

    /**
     * Sending data to the specified microservice.
     * @param service Name is the alias of the microservice.
     * @param method JSON-RPC method.
     * @param data Any data.
     */
    sendTo(service: string, method: string, data: any): Promise<any> {
        return new Promise((resolve, reject) => {
            const startTs = Date.now();
            const client = this.clientsMap.get(service);

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

                if (envs.JRS_EXTERNAL_CALLS_METRICS) {
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

    /**
     * Calling the microservice method.
     * @param service Name is the alias of the microservice.
     * @param method JSON-RPC method.
     * @param params Request parameters.
     */
    async callService(service: string, method: string, params: Record<string, any>): Promise<any> {
        const loggerTemplate = this.makeCallServiceErrorLogger(service, method, params);

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
    async addService(
        service: string,
        connectConfig: string | { connect: string; originRemoteAlias?: string }
    ) {
        if (typeof connectConfig === 'string') {
            connectConfig = { connect: connectConfig, originRemoteAlias: null };
        }

        const client = jayson.Client.http(new URL(connectConfig.connect));

        this.clientsMap.set(service, client);

        if (connectConfig.originRemoteAlias) {
            await this.checkOriginRequiredClient(service, connectConfig);
        }
    }

    /**
     * Get the current value that is returned
     * in the response if the response is empty (equivalent to false)
     * or equal to 'Ok' (legacy).
     * The default value is { status: 'OK' }.
     * @return Value.
     */
    getDefaultResponse(): any {
        return this.defaultResponse;
    }

    /**
     * Set the value that is returned
     * in the response if the response is empty (equivalent to false)
     * or equal to 'Ok' (legacy).
     * The default value is { status: 'OK' }.
     * @param value Value.
     */
    setDefaultResponse(value: any): void {
        this.defaultResponse = value;
    }

    /**
     * Enable response correction in case of an empty response
     * (equivalent to false) or equal to 'Ok' (legacy),
     * which replaces an empty response with a default one
     * (for example on {status: 'OK' }).
     * Initially enabled.
     */
    enableEmptyResponseCorrection(): void {
        this.useEmptyResponseCorrection = true;
    }

    /**
     * Disable response correction in case of an empty response
     * (equivalent to false) or equal to 'Ok' (legacy),
     * which replaces an empty response with a default one
     * (for example on {status: 'OK' }).
     * Initially enabled.
     */
    disableEmptyResponseCorrection(): void {
        this.useEmptyResponseCorrection = false;
    }

    /**
     * Get middleware if the connector is running
     * in the appropriate mode.
     */
    getMiddleware(): Function {
        return this.middleware;
    }

    private startServer(rawRoutes: any, serverDefaults: any): Promise<void> {
        return new Promise((resolve, reject) => {
            const routes = this.normalizeRoutes(rawRoutes, serverDefaults);

            this.injectPingRoute(routes);

            if (this.middlewareMode) {
                this.middleware = new jayson.Server(routes).middleware();
                resolve();
            } else {
                this.server = new jayson.Server(routes).http();

                const handler = error => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve();
                    }
                };

                if (this.socket) {
                    this.server.listen(this.socket, handler);
                } else {
                    this.server.listen(this.port, this.host, handler);
                }
            }
        });
    }

    private async makeClients(requiredClients: any): Promise<void> {
        for (let alias of Object.keys(requiredClients)) {
            await this.addService(alias, requiredClients[alias]);
        }
    }

    private normalizeRoutes(originalRoutes: any, serverDefaults: any): any {
        const routes = {};

        for (const route of Object.keys(originalRoutes)) {
            const originHandler = originalRoutes[route];
            const handler = this.tryApplyConfigInherits(originHandler, serverDefaults);

            routes[route] = this.wrapMethod(route, handler);
        }

        return routes;
    }

    private tryApplyConfigInherits(config: any, serverDefaults: any): any {
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

    private applyValidation(config: any): void {
        config.validation = merge(this.getDefaultValidationInherits(), config.validation);
    }

    private applyInherits(config: any, serverDefaults: any): void {
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

    private applyCustomValidationTypes(config: any, serverDefaults: any): void {
        if (!serverDefaults.validationTypes) {
            return;
        }

        this.resolveCustomInnerTypes(serverDefaults.validationTypes);
        this.resolveCustomTypesForValidation(config.validation, serverDefaults.validationTypes);
    }

    private resolveCustomInnerTypes(types: any): void {
        for (const typeConfig of Object.values(types)) {
            this.resolveValidationType(typeConfig, types);
        }
    }

    private resolveCustomTypesForValidation(validation: any, types: any): void {
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
            } else {
                this.resolveValidationType(validation.items, types);
                this.resolveCustomTypesForValidation(validation.items, types);
            }
        }
    }

    private resolveValidationType(typeConfig: any, types: any): void {
        let typeDefinition = typeConfig.type;

        if (!Array.isArray(typeDefinition)) {
            typeDefinition = [typeDefinition];
        }

        this.resolveValidationTypeForDefinition(typeConfig, typeDefinition, types);

        // @ts-ignore
        typeDefinition = [...new Set(typeDefinition)];

        if (typeDefinition.length === 1) {
            typeDefinition = typeDefinition[0];
        }

        typeConfig.type = typeDefinition;
    }

    private resolveValidationTypeForDefinition(
        typeConfig: any,
        typeDefinition: any,
        types: any
    ): void {
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
            } else {
                typeDefinition.splice(i, 1, ...currentTypes);
            }

            if (currentTypes.some(type => types[type])) {
                // Resolve again
                i--;
            }
        }
    }

    private mergeTypeValidationProperties(customType: Record<string, any>, typeConfig: any): void {
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

    private compileValidation(config: any): void {
        config.validator = ajv.compile(config.validation);
    }

    private wrapMethod(route: any, originHandler: any): any {
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
                } else {
                    data = await this.handleWithOptions(originHandler, params);
                }

                if (this.useEmptyResponseCorrection && (!data || data === 'Ok')) {
                    data = this.defaultResponse;
                }

                callback(null, data);
            } catch (err) {
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

    private async handleWithOptions(config: any, params: any): Promise<void> {
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

    private getDefaultValidationInherits(): any {
        return {
            type: 'object',
            additionalProperties: false,
        };
    }

    private reportStats({
        type,
        method,
        startTs,
        isError = false,
    }: {
        type: string;
        method: string;
        startTs: number;
        isError: boolean;
    }) {
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

        this.metrics.inc(`${metricNamePrefix}_count`, null, labels);
        this.metrics.recordTime(`${metricNamePrefix}_time`, time, labels);
    }

    private handleHandlerError(callback: Function, error: any): void {
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

    private makeCallServiceErrorLogger(service: string, method: any, params: any): any {
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

    private injectPingRoute(routes: any): void {
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

    private async checkOriginRequiredClient(
        service: string,
        { originRemoteAlias, connect }: { originRemoteAlias?: string; connect: string }
    ): Promise<void> {
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
