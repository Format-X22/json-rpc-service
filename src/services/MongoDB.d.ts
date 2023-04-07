import { Basic } from './Basic';
import { IndexDefinition, IndexOptions, Model, Mongoose } from 'mongoose';
export declare class MongoDB extends Basic {
    private metrics;
    constructor();
    static makeModel(name: string, schemaConfig: Record<string, any>, optionsConfig?: {
        index?: Array<{
            fields: IndexDefinition;
            options: IndexOptions;
        }>;
        schema?: any;
    }): Model<any>;
    static get mongoose(): Mongoose;
    static get schemaTypes(): any;
    static get mongoTypes(): any;
    start(forceConnectString?: string, options?: any): Promise<void>;
    stop(): Promise<void>;
}
