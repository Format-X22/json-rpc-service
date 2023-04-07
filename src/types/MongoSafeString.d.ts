import * as mongoose from 'mongoose';
export declare class MongoSafeString extends mongoose.SchemaType {
    cast(value: any): string;
}
