import * as mongoose from 'mongoose';
import { Content } from '../utils/Content';

/**
 * Adds a sanitizer for strings in MongoDB.
 * Type connection occurs automatically when this file is connected.
 */
export class MongoSafeString extends mongoose.SchemaType {
    cast(value) {
        return new Content().sanitize(value);
    }
}

//@ts-ignore
mongoose.Schema.Types.MongoSafeString = MongoSafeString;
