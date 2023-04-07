import * as jayson from 'jayson';
import { Env } from '../utils/Env';

/**
 * The class is an assistant, convenient for use in tests of typical microservices.
 */
export class RpcApiHelper {
    private apiClient: jayson.HttpClient;

    /**
     * @param [apiMountPath] Mount point
     * @param [apiPort] Connection port
     * @param [extractApiFromEnv] Automatically pull up the mount point and port from the .env file
     * @param [envPath] Specify a non-standard path to the .env file
     */
    constructor({
        apiMountPath = '/',
        apiPort = 3000,
        extractApiFromEnv = false,
        envPath = null,
    }: {
        apiMountPath: string;
        apiPort: number;
        extractApiFromEnv: boolean;
        envPath: string;
    }) {
        if (extractApiFromEnv) {
            const envMap = Env.extractFromFile(envPath);
            const apiMountPathFromEnv: string = envMap.get('JRS_SERVER_CONNECTOR_PATH') as string;
            const apiPortFromEnv: string = envMap.get('JRS_CONNECTOR_PORT') as string;

            if (apiMountPathFromEnv) {
                apiMountPath = apiMountPathFromEnv;
            }

            if (apiPortFromEnv) {
                apiPort = parseInt(apiPortFromEnv);
            }
        }

        this.apiClient = jayson.Client.http({ port: apiPort, path: apiMountPath });
    }

    /**
     * Call the JSON-RPC API.
     * @param method RPC Method.
     * @param data Transmitted data.
     * @param throwOnErrorCode Whether to cause an error on the response with the rpc-error section.
     * @return An object with a complete server RPC response.
     */
    callApi(method: string, data: any, throwOnErrorCode: boolean = true): Promise<any> {
        return new Promise((resolve, reject) => {
            this.apiClient.request(method, data, function(error, response) {
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
