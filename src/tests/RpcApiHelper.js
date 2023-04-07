"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RpcApiHelper = void 0;
const jayson = require("jayson");
const Env_1 = require("../utils/Env");
class RpcApiHelper {
    constructor({ apiMountPath = '/', apiPort = 3000, extractApiFromEnv = false, envPath = null, }) {
        if (extractApiFromEnv) {
            const envMap = Env_1.Env.extractFromFile(envPath);
            const apiMountPathFromEnv = envMap.get('JRS_SERVER_CONNECTOR_PATH');
            const apiPortFromEnv = envMap.get('JRS_CONNECTOR_PORT');
            if (apiMountPathFromEnv) {
                apiMountPath = apiMountPathFromEnv;
            }
            if (apiPortFromEnv) {
                apiPort = parseInt(apiPortFromEnv);
            }
        }
        this.apiClient = jayson.Client.http({ port: apiPort, path: apiMountPath });
    }
    callApi(method, data, throwOnErrorCode = true) {
        return new Promise((resolve, reject) => {
            this.apiClient.request(method, data, function (error, response) {
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
exports.RpcApiHelper = RpcApiHelper;
//# sourceMappingURL=RpcApiHelper.js.map