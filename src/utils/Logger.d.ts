export declare class Logger {
    static metrics: any;
    static log(...args: any[]): void;
    static info(...args: any[]): void;
    static warn(...args: any[]): void;
    static error(...args: any[]): void;
    private static _log;
    private static _now;
    private static _tryInitMetrics;
}
