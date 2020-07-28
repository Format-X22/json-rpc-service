const mongoose = require('mongoose');
const Content = require('../utils/Content');

/**
 * Добавляет санитайзер для строк в MongoDB.
 * Подключение типа происходит автоматически при подключении этого файла.
 */
class MongoSafeString extends mongoose.SchemaType {
    cast(value) {
        return new Content().sanitize(value);
    }
}

mongoose.Schema.Types.MongoSafeString = MongoSafeString;

module.exports = mongoose.Schema.Types.MongoSafeString;
