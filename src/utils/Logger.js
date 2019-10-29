require('colors');
const moment = require('moment');

/**
 * Логгер действий.
 * Выводит дату с секундами, PID процесса и маркер вида лога в цвете.
 */
class Logger {
    static metrics = null;

    /**
     * Залогировать обычное действие.
     */
    static log(...args) {
        this._log('[log]', args, 'grey');
    }

    /**
     * Залогировать важное действие.
     */
    static info(...args) {
        this._log('[info]', args, 'blue');
    }

    /**
     * Залогировать некритичную ошибку-уведомление.
     */
    static warn(...args) {
        this._log('[warn]', args, 'yellow');

        this._tryInitMetrics();

        this.metrics.inc('log_warnings');
    }

    /**
     * Залогировать ошибку.
     */
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

module.exports = Logger;
