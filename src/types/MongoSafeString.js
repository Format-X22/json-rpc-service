const mongoose = require('mongoose');
const Content = require('../utils/Content');

/**
 * Adds a sanitizer for strings in MongoDB.
 * Type connection occurs automatically when this file is connected.
 */
class MongoSafeString extends mongoose.SchemaType {
    cast(value) {
        return new Content().sanitize(value);
    }
}

mongoose.Schema.Types.MongoSafeString = MongoSafeString;

module.exports = mongoose.Schema.Types.MongoSafeString;
