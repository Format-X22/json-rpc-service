"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MongoSafeString = void 0;
const mongoose = require("mongoose");
const Content_1 = require("../utils/Content");
class MongoSafeString extends mongoose.SchemaType {
    cast(value) {
        return new Content_1.Content().sanitize(value);
    }
}
exports.MongoSafeString = MongoSafeString;
mongoose.Schema.Types.MongoSafeString = MongoSafeString;
//# sourceMappingURL=MongoSafeString.js.map