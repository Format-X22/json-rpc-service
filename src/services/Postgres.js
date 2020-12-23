const sequelize = require('sequelize');
const BasicService = require('./Basic');
const Logger = require('../utils/Logger');
const env = require('../data/env');

/**
 * Обертка для работы с базой данных Postgres через sequelize.
 * Автоматически подключается к базе данных при запуске.
 * Необходимо указать соответствующие ENV для подключения.
 *
 * Поддерживает подключение только к одной базе данных.
 */
class Postgres extends BasicService {
    /**
     * @return Модуль sequelize целиком.
     */
    static get sequelizeLib() {
        return sequelize;
    }

    /**
     * @return Набор типов данных для моделей.
     */
    static get types() {
        return sequelize.DataTypes;
    }

    /**
     * Конструирует модель по указанной схеме, также устанавливая стандартную
     * конфигурацию - сохраняется момент создания, изменения и удаления каждой
     * модели, при этом удаление в режиме параноид - вместо удаления происходит
     * пометка о дате удаления, что также позволяет восстанавливать удаленное
     * специализированным методом, либо всё же удалять в режиме force при
     * действительной необходимости.
     * @param {string} name Имя модели.
     * @param {*} schemaConfig Конфигурация схемы для модели.
     * @param {*} optionsConfig Дополнительные настройки для модели.
     * @return Модель postgres sequelize.
     */
    static makeModel(name, schemaConfig, optionsConfig = {}) {
        if (!this._sequelizeInstance) {
            throw new Error('Try make model before start service');
        }

        optionsConfig.paranoid = true;
        optionsConfig.timestamps = true;
        optionsConfig.createdAt = 'createTimestamp';
        optionsConfig.updatedAt = 'updateTimestamp';
        optionsConfig.deletedAt = 'destroyTime';

        return this._sequelizeInstance.define(name, schemaConfig, optionsConfig);
    }

    /**
     * Запуск.
     * @param {*} args Аргументы, которые будут переданы предку (BasicService).
     * @return {Promise<void>}
     */
    async start(...args) {
        await super.start(...args);

        BasicService._sequelizeInstance = new sequelize.Sequelize({
            dialect: 'postgres',
            username: env.JRS_POSTGRES_USERNAME,
            password: env.JRS_POSTGRES_PASSWORD,
            host: env.JRS_POSTGRES_HOST,
            port: env.JRS_POSTGRES_PORT,
            database: env.JRS_POSTGRES_DATABASE,
            logging: msg => Logger.log('Postgres:', msg),
        });

        try {
            await BasicService._sequelizeInstance.authenticate();
            Logger.log('Connection to Postgres has been established successfully.');
        } catch (error) {
            Logger.error('Unable to connect to Postgres', error);
        }
    }

    /**
     * Остановка.
     * @param {*} args Аргументы, которые будут переданы предку (BasicService).
     * @return {Promise<void>}
     */
    async stop(...args) {
        await super.stop(...args);

        await BasicService._sequelizeInstance.close();
    }
}

module.exports = Postgres;
