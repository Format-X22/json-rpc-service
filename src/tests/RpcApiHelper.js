const fs = require('fs');
const path = require('path');
const jayson = require('jayson');

/**
 * Класс-помощник, удобный для использования в тестах типовых микросервисов.
 */
class RpcApiHelper {
    /**
     * @param [apiMountPath] Точка монтирования
     * @param [apiPort] Порт подключения
     * @param [extractApiFromEnv] Автоматически подтянуть точку монтирования и порт из .env файла
     * @param [envPath] Указать не стандартный путь до .env файла
     */
    constructor({
        apiMountPath = '/',
        apiPort = 3000,
        extractApiFromEnv = false,
        envPath = path.resolve(__dirname, '..', '.env'),
    }) {
        if (extractApiFromEnv) {
            const rawEnvs = fs.readFileSync(envPath, { encoding: 'utf-8' });
            const envMap = new Map(rawEnvs.split('\n').map(i => i.split('=')));
            const apiMountPathFromEnv = envMap.get('JRS_SERVER_CONNECTOR_PATH');
            const apiPortFromEnv = envMap.get('JRS_CONNECTOR_PORT');

            if (apiMountPathFromEnv) {
                apiMountPath = apiMountPathFromEnv;
            }

            if (apiPortFromEnv) {
                apiPort = apiPortFromEnv;
            }
        }

        this._apiClient = jayson.client.http({ port: apiPort, path: apiMountPath });
    }

    /**
     * Вызвать JSON-PRC API.
     * @param method RPC-Метод.
     * @param data Передаваемые данные.
     * @param throwOnErrorCode Нужно ли вызывать ошибку на ответе с rpc-error секцией.
     * @return {Promise<Object>} Объект с полным RPC-ответом сервера.
     */
    callApi(method, data, throwOnErrorCode = true) {
        return new Promise((resolve, reject) => {
            this._apiClient.request(method, data, function(error, response) {
                if (error) {
                    reject(error);
                }

                if (throwOnErrorCode && response.error) {
                    reject({
                        point: method,
                        error: response.error,
                    });
                }

                resolve(response);
            });
        });
    }
}

module.exports = RpcApiHelper;
