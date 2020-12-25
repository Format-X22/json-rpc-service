const Basic = require('./Basic');
const MongoDB = require('../services/MongoDB');
const Logger = require('../utils/Logger');
const Metrics = require('../utils/PrometheusMetrics');

/**
 * Базовый класс главного класса приложения.
 * Автоматически выполняет стандартные процедуры
 * запуска и остановки микросервиса, полученные
 * опытным путем на других микросервисах и ботах,
 * что убирает ненужный повторяющийся код.
 * Необходимо лишь описать конструктор, поместив
 * необходимые сервисы в nested-хранлище
 * (смотри addNested). Единственным нюансом
 * является необходимость отправки в конструктор
 * этого базового класса клиента StatsD.
 * Дополнительно можно отправить env-объект для
 * автоматической печати переменных env в консоль.
 * Метод boot запускается автоматически на старте,
 * перед запуском вложенных сервисаов.
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
     * Подключит и запустит сервис работы
     * с базой данных MongoDB до запуска метода boot.
     * Сразу сохраняет инстанс сервиса MongoDB внутри класса.
     * @param {string/null} [forceConnectString] Строка подключения,
     * не обязательна.
     * @param {Object} [options] Настройки подключения.
     */
    startMongoBeforeBoot(forceConnectString, options) {
        this._mongoDb = new MongoDB();
        this._startMongoBeforeBoot = true;
        this._mongoDbForceConnectString = forceConnectString;
        this._mongoDbOptions = options;
    }

    /**
     * Получить инстанс сервиса MongoDB, если он есть.
     * Инстанс будет не запущенным до старта этого сервиса.
     * @return {MongoDB/null} Инстанс.
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
