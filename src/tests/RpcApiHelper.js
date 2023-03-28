const jayson = require('jayson');
const Env = require('../utils/Env');

/**
 * The class is an assistant, convenient for use in tests of typical microservices.
 */
class RpcApiHelper {
    /**
     * @param [apiMountPath] Mount point
     * @param [apiPort] Connection port
     * @param [extractApiFromEnv] Automatically pull up the mount point and port from the .env file
     * @param [envPath] Specify a non-standard path to the .env file
     */
    constructor({ apiMountPath = '/', apiPort = 3000, extractApiFromEnv = false, envPath = null }) {
        if (extractApiFromEnv) {
            const envMap = Env.extractFromFile(envPath);
            const apiMountPathFromEnv = envMap.get('JRS_SERVER_CONNECTOR_PATH');
            const apiPortFromEnv = envMap.get('JRS_CONNECTOR_PORT');

            if (apiMountPathFromEnv) {
                apiMountPath = apiMountPathFromEnv;
            }

            if (apiPortFromEnv) {
                apiPort = parseInt(apiPortFromEnv);
            }
        }

        this._apiClient = jayson.client.http({ port: apiPort, path: apiMountPath });
    }

    /**
     * Call the JSON-RPC API.
     * @param method RPC Method.
     * @param data Transmitted data.
     * @param throwOnErrorCode Whether to cause an error on the response with the rpc-error section.
     * @return {Promise<Object>} An object with a complete server RPC response.
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
