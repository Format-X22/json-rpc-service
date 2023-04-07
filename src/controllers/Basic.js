"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Basic = void 0;
const Logger_1 = require("../utils/Logger");
class Basic {
    constructor({ connector } = {}) {
        if (connector) {
            this.connector = connector;
        }
    }
    async sendTo(...args) {
        if (this.connector) {
            return await this.connector.sendTo(...args);
        }
        else {
            Logger_1.Logger.error('Basic controller - connector not defined');
            console.trace();
            throw 'Connector not defined';
        }
    }
    async callService(service, method, params) {
        if (this.connector) {
            return await this.connector.callService(service, method, params);
        }
        else {
            Logger_1.Logger.error('Basic controller - connector not defined');
            console.trace();
            throw 'Connector not defined';
        }
    }
}
exports.Basic = Basic;
//# sourceMappingURL=Basic.js.map