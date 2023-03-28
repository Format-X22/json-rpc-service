const mongoose = require('mongoose');
const BigNum = require('./BigNum');

/**
 * Adds the ability to use BigNum to store data in MongoDB.
 * Type connection occurs automatically when this file is connected.
 */
class MongoBigNum extends mongoose.SchemaType {
    cast(value) {
        return new BigNum(value);
    }
}

mongoose.Schema.Types.MongoBigNum = MongoBigNum;

module.exports = mongoose.Schema.Types.MongoBigNum;
