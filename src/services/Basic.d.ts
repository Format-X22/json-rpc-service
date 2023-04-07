/// <reference types="node" />
import * as EventEmitter from 'node:events';
export declare abstract class Basic {
    private exclusiveIterationInProcess;
    private loopId;
    private doneFlag;
    private emitter;
    protected nestedServices: Array<any>;
    allowParallelIterations: boolean;
    throwOnIterationError: boolean;
    constructor();
    isDone(): boolean;
    done(): void;
    start(...args: Array<any>): Promise<void>;
    stop(...args: Array<any>): Promise<void>;
    restore(...args: Array<any>): Promise<void>;
    retry(...args: Array<any>): Promise<void>;
    boot(): Promise<void>;
    addNested(...services: Array<Basic>): void;
    startNested(): Promise<void>;
    stopNested(): Promise<void>;
    stopOnExit(): void;
    throwOnUnhandledPromiseRejection(): void;
    iteration(...args: Array<any>): Promise<void>;
    startLoop(firstIterationTimeout?: number, interval?: number): void;
    stopLoop(): void;
    printEnvBasedConfig(serviceEnv?: Record<string, any>): void;
    getEmitter(): EventEmitter;
    emit(name: string | symbol, ...data: Array<any>): void;
    translateEmit(from: Record<string, any> | Array<Record<string, any>>, ...events: Array<string>): void;
    on(name: string | symbol, callback: (...args: Array<any>) => void): void;
    once(name: string | symbol, callback: (...args: Array<any>) => void): void;
    private runIteration;
    private handleIteration;
}
