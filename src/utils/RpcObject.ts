import * as jayson from 'jayson';

/**
 * Utility for generating RPC objects for the communication protocol.
 * Necessary only for manual work with the protocol, in all
 * other cases it is enough to stick to the Connector api
 * (see the services/Connector class).
 */
export class RpcObject {
    /**
     * Generate a successful response.
     * @param result [Result].
     * @param [id] Response ID.
     */
    static success(result: Record<string, any>, id: number | string): any {
        return this.response(null, result, id);
    }

    /**
     * Generate an error response.
     * @param errorOrErrorCode Error object or error code.
     * @param [errorOrErrorCode.code] Error code.
     * @param [errorOrErrorCode.message] Description of the error.
     * @param [messageText] Error description (if the first argument was code).
     */
    static error(
        errorOrErrorCode:
            | Record<string, any>
            | number
            | { code: number; message: string; messageText: string },
        messageText
    ) {
        let code;
        let message;

        if (arguments.length === 1) {
            code = arguments[0].code;
            message = arguments[0].message;
        } else {
            code = arguments[0];
            message = arguments[1];
        }

        const error = jayson.Server.prototype.error(code, message);

        return this.response(error);
    }

    /**
     * Generate a response.
     * @param {Object/null} [error] Error object (not if result).
     * @param {Object/null} [result] Result (not if error, but it can be empty).
     * @param {number/string/null} [id] Response ID.
     */
    static response(
        error: Record<string, any>,
        result?: Record<string, any>,
        id?: number | string
    ): any {
        //@ts-ignore
        return jayson.Utils.response(error, result, id);
    }

    /**
     * Form a request.
     * @param {string} method Request method.
     * @param {Object/null} [data] Data for the request.
     * @param {number/string/null} [id] Request ID.
     */
    static request(method: string, data?: Record<string, any>, id?: number | string): any {
        //@ts-ignore
        return jayson.Utils.request(method, data, id);
    }
}
