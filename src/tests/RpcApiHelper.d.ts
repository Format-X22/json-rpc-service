export declare class RpcApiHelper {
    private apiClient;
    constructor({ apiMountPath, apiPort, extractApiFromEnv, envPath, }: {
        apiMountPath: string;
        apiPort: number;
        extractApiFromEnv: boolean;
        envPath: string;
    });
    callApi(method: string, data: any, throwOnErrorCode?: boolean): Promise<any>;
}
