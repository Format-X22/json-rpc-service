import { Express } from 'express';

const express = require('express');
const client = require('prom-client');
const env = require('../data/env');
const Logger = require('./Logger');

let createdAlready = false;

/**
 * The class provides the Prometheus metrics server.
 * The class is a singleton and skips the attempt
 * creating another instance by returning an existing one.
 */
export class PrometheusMetrics {
    private static instance: PrometheusMetrics;

    counters: Map<any, any>;
    gauges: Map<any, any>;
    histograms: Map<any, any>;

    server: Express;

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
                // An error when raising metrics should not ruin the application, just log in.
                Logger.warn('PrometheusMetrics server start failed:', err);
            }
        });

        PrometheusMetrics.instance = this;

        createdAlready = true;
    }

    /**
     * Increase the counter.
     * @param metricName
     * @param [count=1]
     * @param [labels]
     */
    inc(metricName: string, count = 1, labels?: Record<string, any>): void {
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
     * @param metricName
     * @param value
     * @param [labels]
     */
    set(metricName: string, value: number, labels: Record<string, any>): void {
        const gauge = this.getGauge(metricName, labels);

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
     * @param metricName
     * @param time
     * @param [labels]
     */
    recordTime(metricName: string, time: number, labels: Record<string, any>): void {
        const histogram = this.getHistogram(metricName, labels);

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
     * @param metricName
     * @param [labels]
     */
    startTimer(metricName: string, labels: Record<string, any>): Function {
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

        return this.getHistogram(metricName, labels).startTimer(labels);
    }

    private getCounter(metricName: string, labels: Record<string, any>) {
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

    private getGauge(metricName, labels) {
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

    private getHistogram(metricName, labels) {
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

    private getLabelNames(labels) {
        if (!labels) {
            return [];
        }

        return Object.keys(labels).sort();
    }
}
