"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = void 0;
require('colors');
const moment = require('moment');
class Logger {
    static log(...args) {
        this._log('[log]', args, 'grey');
    }
    static info(...args) {
        this._log('[info]', args, 'blue');
    }
    static warn(...args) {
        this._log('[warn]', args, 'yellow');
        this._tryInitMetrics();
        this.metrics.inc('log_warnings');
    }
    static error(...args) {
        this._log('[error]', args, 'red');
        this._tryInitMetrics();
        this.metrics.inc('log_errors');
    }
    static _log(prefix, data, color) {
        console.log(...[this._now(), `<${process.pid}>`, prefix[color], ...data]);
    }
    static _now() {
        return moment().format('YYYY-MM-DD HH:mm:ss');
    }
    static _tryInitMetrics() {
        if (!this.metrics) {
            const Metrics = require('../utils/PrometheusMetrics');
            this.metrics = new Metrics();
        }
    }
}
Logger.metrics = null;
exports.Logger = Logger;
//# sourceMappingURL=Logger.js.map