import { Express } from 'express';
export declare class PrometheusMetrics {
    private static instance;
    counters: Map<any, any>;
    gauges: Map<any, any>;
    histograms: Map<any, any>;
    server: Express;
    constructor();
    inc(metricName: string, count?: number, labels?: Record<string, any>): void;
    set(metricName: string, value: number, labels: Record<string, any>): void;
    recordTime(metricName: string, time: number, labels: Record<string, any>): void;
    startTimer(metricName: string, labels: Record<string, any>): Function;
    private getCounter;
    private getGauge;
    private getHistogram;
    private getLabelNames;
}
