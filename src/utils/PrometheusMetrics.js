const express = require('express');
const client = require('prom-client');
const env = require('../data/env');
const Logger = require('../utils/Logger');

let createdAlready = false;

/**
 * The class provides the Prometheus metrics server.
 * The class is a singleton and skips the attempt
 * creating another instance by returning an existing one.
 */
class PrometheusMetrics {
    constructor() {
        if (createdAlready) {
            return PrometheusMetrics._instance;
        }

        if (env.JRS_SYSTEM_METRICS) {
            client.collectDefaultMetrics({ timeout: 5000 });
        }

        this._counters = new Map();
        this._gauges = new Map();
        this._histograms = new Map();

        this._server = express();

        this._server.get('/metrics', (req, res) => {
            res.set('Content-Type', client.register.contentType);
            res.end(client.register.metrics());
        });

        this._server.listen(env.JRS_METRICS_PORT, env.JRS_METRICS_HOST, err => {
            if (err) {
                // An error when raising metrics should not ruin the application, just log in.
                Logger.warn('PrometheusMetrics server start failed:', err);
            }
        });

        PrometheusMetrics._instance = this;

        createdAlready = true;
    }

    /**
     * Increase the counter.
     * @param {string} metricName
     * @param {number} [count=1]
     * @param {Object} [labels]
     */
    inc(metricName, count = 1, labels) {
        if (count && typeof count !== 'number') {
            labels = count;
            count = 1;
        }

        const counter = this._getCounter(metricName, labels);

        if (labels) {
            counter.inc(labels, count);

            if (env.JRS_METRICS_TO_LOG) {
                Logger.log(`METRICS: Inc ${metricName}:${JSON.stringify(labels)} by ${count}`);
            }
        } else {
            counter.inc(count);

            if (env.JRS_METRICS_TO_LOG) {
                Logger.log(`METRICS: Inc ${metricName} by ${count}`);
            }
        }
    }

    /**
     * Set the metric value.
     * (the charts will always display the last set value without aggregation)
     * @param {string} metricName
     * @param {number} value
     * @param {Object} [labels]
     */
    set(metricName, value, labels) {
        const gauge = this._getGauge(metricName, labels);

        if (labels) {
            gauge.set(labels, value);

            if (env.JRS_METRICS_TO_LOG) {
                Logger.log(`METRICS: Set ${metricName}:${JSON.stringify(labels)} to ${value}`);
            }
        } else {
            gauge.set(value);

            if (env.JRS_METRICS_TO_LOG) {
                Logger.log(`METRICS: Set ${metricName} to ${value}`);
            }
        }
    }

    /**
     * Record the time.
     * @param {string} metricName
     * @param {number} time
     * @param {Object} [labels]
     */
    recordTime(metricName, time, labels) {
        const histogram = this._getHistogram(metricName, labels);

        if (labels) {
            histogram.observe(labels, time);

            if (env.JRS_METRICS_TO_LOG) {
                Logger.log(`METRICS: Observe ${metricName}:${JSON.stringify(labels)} at ${time}`);
            }
        } else {
            histogram.observe(time);

            if (env.JRS_METRICS_TO_LOG) {
                Logger.log(`METRICS: Observe ${metricName} at ${time}`);
            }
        }
    }

    /**
     * Start time measurement, returns the function to be called at the end of the measurement.
     * @param {string} metricName
     * @param {Object} [labels]
     * @returns {Function}
     */
    startTimer(metricName, labels) {
        if (labels) {
            if (env.JRS_METRICS_TO_LOG) {
                Logger.log(
                    `METRICS: Start timer ${metricName}:${JSON.stringify(labels)} at ${new Date()}`
                );
            }
        } else {
            if (env.JRS_METRICS_TO_LOG) {
                Logger.log(`METRICS: Start timer ${metricName} at ${new Date()}`);
            }
        }

        return this._getHistogram(metricName, labels).startTimer(labels);
    }

    _getCounter(metricName, labels) {
        let counter = this._counters.get(metricName);

        if (!counter) {
            const labelNames = this._getLabelNames(labels);

            counter = new client.Counter({
                name: metricName,
                help: 'no help',
                labelNames,
            });
            this._counters.set(metricName, counter);
        }

        return counter;
    }

    _getGauge(metricName, labels) {
        let gauge = this._gauges.get(metricName);

        if (!gauge) {
            const labelNames = this._getLabelNames(labels);

            gauge = new client.Gauge({
                name: metricName,
                help: 'no help',
                labelNames,
            });
            this._gauges.set(metricName, gauge);
        }

        return gauge;
    }

    _getHistogram(metricName, labels) {
        let histogram = this._histograms.get(metricName);

        if (!histogram) {
            const labelNames = this._getLabelNames(labels);

            histogram = new client.Histogram({
                name: metricName,
                help: 'no help',
                labelNames,
                buckets: [0.2, 0.5, 1, 2, 4, 10],
            });
            this._histograms.set(metricName, histogram);
        }

        return histogram;
    }

    _getLabelNames(labels) {
        if (!labels) {
            return [];
        }

        return Object.keys(labels).sort();
    }
}

module.exports = PrometheusMetrics;
