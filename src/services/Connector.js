const merge = require('deepmerge');
const Ajv = require('ajv');
const ajv = new Ajv({ useDefaults: true });
const jayson = require('jayson');
const env = require('../data/env');
const Logger = require('../utils/Logger');
const BasicService = require('./Basic');
const Metrics = require('../utils/PrometheusMetrics');

/**
 * Сервис связи между микросервисами.
 * При необходимости поднимает сервер обработки входящих подключений и/или
 * обработчики запросов исходящих запросов.
 * Работает посредством JSON-RPC.
 * Сервер связи конфигурируется объектом роутинга в двух вариациях.
 *
 * Может работать в режиме middleware.
 * При вместо создания сервера будет доступен метод getMiddleware,
 * возвращающий middleware, совместимый с классом WebServer
 * и библиотекой ExpressJS.
 *
 * Лаконичная:
 *
 * ```
 * serverRoutes: {
 *     transfer: (data) => handler(data),
 *     history: this._handler.bind(this),
 * }
 * ...
 * ```
 *
 * Полная и с ajv валидацией:
 *
 * ```
 * serverRoutes: {
 *     transfer: {
 *         handler: this._handler,  // Обработчик вызова
 *         scope: this,             // Скоуп вызова обработчика
 *         validation: {            // ajv-схема валидации параметров
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
 * Стоит учитывать что валидация сразу устанавливает запрет на отправку дополнительных
 * полей и предполагает что параметры будут именно объектом, что соответствует
 * конфигу ajv:
 *
 * ```
 * type: 'object',
 * additionalProperties: false,
 * ```
 *
 * Также имеется возможность указать пре-обработчики и пост-обработчики.
 * Пре, пост и оргигинальный обработчик работают по принципу конвеера -
 * если они что-либо возвращают - оно будет передано далее, в ином случае
 * далее будет переданы оригинальные аргументы, но передачей по ссылке -
 * если аргумент был объектом и его поля были изменены - изменения
 * будут содержаться и в следующем обработчике. Самый первый обработчик
 * получает оригинал данных от клиента, а данные последнего обработчика
 * будут отправлены клиенту как ответ. Особое поведение лишь у оригинального
 * обработчика - в случае отсутствия ответа (значение undefined)
 * будет передано именно это значение, а не аргументы.
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
 *         handler: this._handler,  // Обработчик вызова
 *         scope: this,             // Скоуп вызова обработчика
 *     }
 * }
 * ...
 * ```
 *
 * При необходимости можно вынести повторяющиеся части в дефолтный конфиг
 * и унаследоваться от него через алиас.
 * В случае указания одного или нескольких extends сначала будет взят
 * первый конфиг, сверху добавлены с перезаписью и глубоким мержем
 * остальные, в конце добавляется оригинал.
 *
 * В данном примере мы создаем роут 'transfer' и наследуем валидацию
 * от конфига 'auth', которая добавляет нам обязательное поле 'secret'.
 *
 * ```
 * serverRoutes: {
 *     transfer: {
 *         handler: this._handler,  // Обработчик вызова
 *         scope: this,             // Скоуп вызова обработчика
 *         inherits: ['auth']       // Имя парент-конфига
 *     }
 * },
 * serverDefaults: {
 *     parents: {                         // Пречисление конфигов
 *         auth: {                        // Имя конфига
 *             validation: {              // Дефолтные данные валидации.
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
 * Для удобства валидации можно добавить собственные типы валидации
 * основанные на базовых. Типы поддерживаются внутри конфигурации
 * properties, а также внутри oneOf, anyOf и allOf.
 *
 * В данном примере мы добавляем и используем тип, который валидирует
 * параметр как строку, устанавливает максимальную длинну в 100 символов,
 * а также разрешаем параметру быть типом null.
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
 *                     type: 'message'   // Используем наш нестандартный тип
 *                 }
 *             }
 *         }
 *     }
 * },
 * serverDefaults: {
 *     validationTypes: {                // Объявляем что у нас есть нестандартные типы
 *         message: {                    // Указываем имя типа
 *             type: 'stringOrNull',     // Используем в основе наш тип 'stringOrNull'
 *             maxLength: 100            // Устанавливаем дополнительную валидацию
 *         },
 *         stringOrNull: {               // Указываем имя типа
 *             type: ['string', 'null']  // Используем встроенные типы 'string' и 'null'
 *         }
 *     }
 * }
 * ```
 *
 * Для того чтобы использовать метод `callService` необходимо задать алиасы
 * запросов - алиас является именем, которое указывает на ссылку куда необходимо
 * отправить запрос. Задать их можно двумя способами.
 *
 * Сразу в конфигурации в методе `start`:
 *
 *  ```
 *  requiredClients: {
 *      alias1: 'http://connect.string1',
 *      alias2: 'http://connect.string2',
 *  }
 *  ...
 *  ```
 *
 * Либо можно добавлять их динамически через метод `addService`.
 *
 * Дополнительно можно указать строгий режим для алиасов - при запуске микросервис
 * сделает ping-запросы на все необходимые микросервисы и проверит соответствие
 * алиасов в ответах сервисов с указанными алиасами:
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
     * Переключить в режим middleware.
     * Вместо создания сервера будет доступен метод getMiddleware,
     * возвращающий middleware, совместимый с классом Server (ExpressJS).
     * @type {boolean} Включение.
     */
    middlewareMode = false;

    /**
     * @param {string} [host] Адрес подключения, иначе возьмется из JRS_CONNECTOR_HOST.
     * @param {number} [port] Порт подключения, иначе возьмется из JRS_CONNECTOR_PORT.
     * @param {string} [socket] Сокет подключения, иначе возьмется из JRS_CONNECTOR_SOCKET.
     * @param {string} [alias] Алиас коннектора в сети, иначе возьмется из JRS_CONNECTOR_ALIAS_NAME.
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
     * Запуск сервиса с конфигурацией.
     * Все параметры являются не обязательными.
     * @param [serverRoutes] Конфигурация роутера, смотри описание класса.
     * @param [serverDefaults] Конфигурация дефолтов сервера, смотри описание класса.
     * @param [requiredClients] Конфигурация необходимых клиентов, смотри описание класса.
     * @returns {Promise<void>} Промис без экстра данных.
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
     * Остановка сервиса.
     * @returns {Promise<void>} Промис без экстра данных.
     */
    async stop() {
        if (this._server) {
            this._server.close();
        }
    }

    /**
     * Оправка данных указанному микросервису.
     * @param {string} service Имя-алиас микросервиса.
     * @param {string} method Метод JSON-RPC.
     * @param {*} data Любые данные.
     * @returns {Promise<*>} Данные ответа либо ошибка.
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

                process.exit(1);
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
     * Вызов метода микросервиса.
     * @param {string} service Имя-алиас микросервиса.
     * @param {string} method Метод JSON-RPC.
     * @param {Object} params Параметры запроса.
     * @returns {Promise<*>} Ответ.
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
     * Динамически добавляет сервис к списку известных сервисов.
     * @param {string} service Имя-алиас микросервиса для использования в коде при вызове.
     * @param {string/Object} connectConfig Строка или конфиг подключения.
     * @param {string} connectConfig.connect Строка подключения.
     * @param {string/null} connectConfig.originRemoteAlias Реальное имя-алиас удаленного микросервиса.
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
     * Получить текущее значение, которое возвращается
     * в ответе в случае если ответ пуст (эквивалентен false)
     * или равен 'Ok' (legacy).
     * Дефолтное значение - { status: 'OK' }.
     * @return {*} Значение.
     */
    getDefaultResponse() {
        return this._defaultResponse;
    }

    /**
     * Установить значение, которое возвращается
     * в ответе в случае если ответ пуст (эквивалентен false)
     * или равен 'Ok' (legacy).
     * Дефолтное значение - { status: 'OK' }.
     * @param {*} value Значение.
     */
    setDefaultResponse(value) {
        this._defaultResponse = value;
    }

    /**
     * Включить коррекцию ответа в случае пустого ответа
     * (эквивалентного false) или равного 'Ok' (legacy),
     * которая заменяет пустой ответ на дефолтный
     * (например на { status: 'OK' }).
     * Изначально включено.
     */
    enableEmptyResponseCorrection() {
        this._useEmptyResponseCorrection = true;
    }

    /**
     * Выключить коррекцию ответа в случае пустого ответа
     * (эквивалентного false) или равного 'Ok' (legacy),
     * которая заменяет пустой ответ на дефолтный
     * (например на { status: 'OK' }).
     * Изначально включено.
     */
    disableEmptyResponseCorrection() {
        this._useEmptyResponseCorrection = false;
    }

    /**
     * Получить middleware в случае если коннектор запущен
     * в соответствующем режиме.
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
                process.exit(1);
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
            callback(null, {
                status: 'OK',
                alias: this._alias,
            });
        };
    }

    async _checkOriginRequiredClient(service, { originRemoteAlias, connect }) {
        const time = Date.now();
        const self = this;

        async function check() {
            try {
                const { alias } = await self.callService(service, '_ping', {});

                if (alias !== originRemoteAlias) {
                    Logger.error(
                        `Try connect to "${originRemoteAlias}", ` +
                            `but gain response from "${alias}" service, check connection config`
                    );
                    process.exit(1);
                }
            } catch (error) {
                if (time + 30_000 < Date.now()) {
                    Logger.error(
                        `Cant establish connection with "${service}" service use "${connect}"`
                    );
                    Logger.error('Explain:', error);
                    process.exit(1);
                }

                await new Promise(resolve => {
                    setTimeout(resolve, 100);
                });

                await check();
            }
        }

        await check();
    }
}

module.exports = Connector;
