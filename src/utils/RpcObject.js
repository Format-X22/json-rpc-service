const jayson = require('jayson');

/**
 * Utility for generating RPC objects for the communication protocol.
 * Necessary only for manual work with the protocol, in all
 * other cases it is enough to stick to the Connector api
 * (see the services/Connector class).
 */
class RpcObject {
    /**
     * Generate a successful response.
     * @param {Object/null} result [Result].
     * @param {number/string/null} [id] Response ID.
     */
    static success(result, id) {
        return this.response(null, result, id);
    }

    /**
     * Generate an error response.
     * @param {Object/number/null} errorOrErrorCode Error object or error code.
     * @param {number/null} [errorOrErrorCode.code] Error code.
     * @param {string/null} [errorOrErrorCode.message] Description of the error.
     * @param {string/null} [messageText] Error description (if the first argument was code).
     */
    static error(errorOrErrorCode, messageText) {
        let code;
        let message;

        if (arguments.length === 1) {
            code = arguments[0].code;
            message = arguments[0].message;
        } else {
            code = arguments[0];
            message = arguments[1];
        }

        const error = jayson.server.prototype.error(code, message);

        return this.response(error);
    }

    /**
     * Generate a response.
     * @param {Object/null} [error] Error object (not if result).
     * @param {Object/null} [result] Result (not if error, but it can be empty).
     * @param {number/string/null} [id] Response ID.
     */
    static response(error, result, id) {
        return jayson.utils.response(error, result, id);
    }

    /**
     * Form a request.
     * @param {string} method Request method.
     * @param {Object/null} [data] Data for the request.
     * @param {number/string/null} [id] Request ID.
     */
    static request(method, data, id) {
        return jayson.utils.request(method, data, id);
    }
}

module.exports = RpcObject;
