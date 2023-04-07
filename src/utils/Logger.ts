require('colors');
const moment = require('moment');

/**
 * Action logger.
 * Displays the date with seconds, the PID of the process and the marker of the log type in color.
 */
export class Logger {
    static metrics = null;

    /**
     * Log normal action
     */
    static log(...args): void {
        this._log('[log]', args, 'grey');
    }

    /**
     * Log important action
     */
    static info(...args): void {
        this._log('[info]', args, 'blue');
    }

    /**
     * Log warning
     */
    static warn(...args): void {
        this._log('[warn]', args, 'yellow');

        this._tryInitMetrics();

        this.metrics.inc('log_warnings');
    }

    /**
     * Log error
     */
    static error(...args): void {
        this._log('[error]', args, 'red');

        this._tryInitMetrics();

        this.metrics.inc('log_errors');
    }

    private static _log(prefix, data, color) {
        console.log(...[this._now(), `<${process.pid}>`, prefix[color], ...data]);
    }

    private static _now() {
        return moment().format('YYYY-MM-DD HH:mm:ss');
    }

    private static _tryInitMetrics() {
        if (!this.metrics) {
            const Metrics = require('../utils/PrometheusMetrics');

            this.metrics = new Metrics();
        }
    }
}
