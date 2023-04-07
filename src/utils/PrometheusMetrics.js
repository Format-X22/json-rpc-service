"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrometheusMetrics = void 0;
const express = require('express');
const client = require('prom-client');
const env = require('../data/env');
const Logger = require('./Logger');
let createdAlready = false;
class PrometheusMetrics {
    constructor() {
        if (createdAlready) {
            return PrometheusMetrics.instance;
        }
        if (env.JRS_SYSTEM_METRICS) {
            client.collectDefaultMetrics({ timeout: 5000 });
        }
        this.counters = new Map();
        this.gauges = new Map();
        this.histograms = new Map();
        this.server = express();
        this.server.get('/metrics', (req, res) => {
            res.set('Content-Type', client.register.contentType);
            res.end(client.register.metrics());
        });
        this.server.listen(env.JRS_METRICS_PORT, env.JRS_METRICS_HOST, err => {
            if (err) {
                Logger.warn('PrometheusMetrics server start failed:', err);
            }
        });
        PrometheusMetrics.instance = this;
        createdAlready = true;
    }
    inc(metricName, count = 1, labels) {
        if (count && typeof count !== 'number') {
            labels = count;
            count = 1;
        }
        const counter = this.getCounter(metricName, labels);
        if (labels) {
            counter.inc(labels, count);
            if (env.JRS_METRICS_TO_LOG) {
                Logger.log(`METRICS: Inc ${metricName}:${JSON.stringify(labels)} by ${count}`);
            }
        }
        else {
            counter.inc(count);
            if (env.JRS_METRICS_TO_LOG) {
                Logger.log(`METRICS: Inc ${metricName} by ${count}`);
            }
        }
    }
    set(metricName, value, labels) {
        const gauge = this.getGauge(metricName, labels);
        if (labels) {
            gauge.set(labels, value);
            if (env.JRS_METRICS_TO_LOG) {
                Logger.log(`METRICS: Set ${metricName}:${JSON.stringify(labels)} to ${value}`);
            }
        }
        else {
            gauge.set(value);
            if (env.JRS_METRICS_TO_LOG) {
                Logger.log(`METRICS: Set ${metricName} to ${value}`);
            }
        }
    }
    recordTime(metricName, time, labels) {
        const histogram = this.getHistogram(metricName, labels);
        if (labels) {
            histogram.observe(labels, time);
            if (env.JRS_METRICS_TO_LOG) {
                Logger.log(`METRICS: Observe ${metricName}:${JSON.stringify(labels)} at ${time}`);
            }
        }
        else {
            histogram.observe(time);
            if (env.JRS_METRICS_TO_LOG) {
                Logger.log(`METRICS: Observe ${metricName} at ${time}`);
            }
        }
    }
    startTimer(metricName, labels) {
        if (labels) {
            if (env.JRS_METRICS_TO_LOG) {
                Logger.log(`METRICS: Start timer ${metricName}:${JSON.stringify(labels)} at ${new Date()}`);
            }
        }
        else {
            if (env.JRS_METRICS_TO_LOG) {
                Logger.log(`METRICS: Start timer ${metricName} at ${new Date()}`);
            }
        }
        return this.getHistogram(metricName, labels).startTimer(labels);
    }
    getCounter(metricName, labels) {
        let counter = this.counters.get(metricName);
        if (!counter) {
            const labelNames = this.getLabelNames(labels);
            counter = new client.Counter({
                name: metricName,
                help: 'no help',
                labelNames,
            });
            this.counters.set(metricName, counter);
        }
        return counter;
    }
    getGauge(metricName, labels) {
        let gauge = this.gauges.get(metricName);
        if (!gauge) {
            const labelNames = this.getLabelNames(labels);
            gauge = new client.Gauge({
                name: metricName,
                help: 'no help',
                labelNames,
            });
            this.gauges.set(metricName, gauge);
        }
        return gauge;
    }
    getHistogram(metricName, labels) {
        let histogram = this.histograms.get(metricName);
        if (!histogram) {
            const labelNames = this.getLabelNames(labels);
            histogram = new client.Histogram({
                name: metricName,
                help: 'no help',
                labelNames,
                buckets: [0.2, 0.5, 1, 2, 4, 10],
            });
            this.histograms.set(metricName, histogram);
        }
        return histogram;
    }
    getLabelNames(labels) {
        if (!labels) {
            return [];
        }
        return Object.keys(labels).sort();
    }
}
exports.PrometheusMetrics = PrometheusMetrics;
//# sourceMappingURL=PrometheusMetrics.js.map