require('colors');
const moment = require('moment');

/**
 * Action logger.
 * Displays the date with seconds, the PID of the process and the marker of the log type in color.
 */
class Logger {
    static metrics = null;

    /**
     * Log normal action
     */
    static log(...args) {
        this._log('[log]', args, 'grey');
    }

    /**
     * Log important action
     */
    static info(...args) {
        this._log('[info]', args, 'blue');
    }

    /**
     * Log warning
     */
    static warn(...args) {
        this._log('[warn]', args, 'yellow');

        this._tryInitMetrics();

        this.metrics.inc('log_warnings');
    }

    /**
     * Log error
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
