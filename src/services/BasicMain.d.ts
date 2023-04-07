import { Basic } from './Basic';
import { MongoDB } from './MongoDB';
export declare class BasicMain extends Basic {
    private startMongoBeforeBootFlag;
    private mongoDbForceConnectString;
    private mongoDbOptions;
    private metrics;
    private mongoDb;
    constructor(env?: any);
    start(): Promise<void>;
    stop(): Promise<void>;
    startMongoBeforeBoot(forceConnectString: string, options: Record<string, any>): void;
    getMongoDbInstance(): MongoDB;
    private tryIncludeDbToNested;
    private tryStartDbBeforeBoot;
    private tryExcludeDbFromNested;
}
