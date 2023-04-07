"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Logger = require('../utils/Logger');
exports.default = (Main) => {
    new Main().start().then(() => {
        Logger.info('Main service started!');
    }, error => {
        Logger.error('Main service failed:', error);
        process.exit(1);
    });
};
//# sourceMappingURL=defaultStarter.js.map