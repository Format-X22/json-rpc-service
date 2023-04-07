"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RpcObject = void 0;
const jayson = require("jayson");
class RpcObject {
    static success(result, id) {
        return this.response(null, result, id);
    }
    static error(errorOrErrorCode, messageText) {
        let code;
        let message;
        if (arguments.length === 1) {
            code = arguments[0].code;
            message = arguments[0].message;
        }
        else {
            code = arguments[0];
            message = arguments[1];
        }
        const error = jayson.Server.prototype.error(code, message);
        return this.response(error);
    }
    static response(error, result, id) {
        return jayson.Utils.response(error, result, id);
    }
    static request(method, data, id) {
        return jayson.Utils.request(method, data, id);
    }
}
exports.RpcObject = RpcObject;
//# sourceMappingURL=RpcObject.js.map