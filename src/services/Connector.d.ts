import { Basic } from './Basic';
export declare class Connector extends Basic {
    private host;
    private port;
    private socket;
    private alias;
    private server;
    private clientsMap;
    private defaultResponse;
    private useEmptyResponseCorrection;
    private metrics;
    private middleware;
    private payloadHandler;
    middlewareMode: boolean;
    constructor({ host, port, socket, alias, }?: {
        host?: string;
        port?: number;
        socket?: string;
        alias?: string;
    });
    start({ serverRoutes, serverDefaults, requiredClients, }: {
        serverRoutes: any;
        serverDefaults: any;
        requiredClients: any;
    }): Promise<void>;
    stop(): Promise<void>;
    sendTo(service: string, method: string, data: any): Promise<any>;
    callService(service: string, method: string, params: Record<string, any>): Promise<any>;
    addService(service: string, connectConfig: string | {
        connect: string;
        originRemoteAlias?: string;
    }): Promise<void>;
    getDefaultResponse(): any;
    setDefaultResponse(value: any): void;
    enableEmptyResponseCorrection(): void;
    disableEmptyResponseCorrection(): void;
    getMiddleware(): Function;
    private startServer;
    private makeClients;
    private normalizeRoutes;
    private tryApplyConfigInherits;
    private applyValidation;
    private applyInherits;
    private applyCustomValidationTypes;
    private resolveCustomInnerTypes;
    private resolveCustomTypesForValidation;
    private resolveValidationType;
    private resolveValidationTypeForDefinition;
    private mergeTypeValidationProperties;
    private compileValidation;
    private wrapMethod;
    private handleWithOptions;
    private getDefaultValidationInherits;
    private reportStats;
    private handleHandlerError;
    private makeCallServiceErrorLogger;
    private injectPingRoute;
    private checkOriginRequiredClient;
}
