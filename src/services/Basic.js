"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Basic = void 0;
const EventEmitter = require("node:events");
const Logger_1 = require("../utils/Logger");
const env_1 = require("../data/env");
class Basic {
    constructor() {
        this.exclusiveIterationInProcess = false;
        this.allowParallelIterations = true;
        this.throwOnIterationError = true;
        this.nestedServices = [];
        this.doneFlag = false;
        this.emitter = new EventEmitter();
    }
    isDone() {
        return this.doneFlag;
    }
    done() {
        this.doneFlag = true;
    }
    async start(...args) {
        await this.startNested();
    }
    async stop(...args) {
        await this.stopNested();
    }
    async restore(...args) {
    }
    async retry(...args) {
    }
    async boot() {
    }
    addNested(...services) {
        this.nestedServices.push(...services);
    }
    async startNested() {
        Logger_1.Logger.info('Start services...');
        for (let service of this.nestedServices) {
            Logger_1.Logger.info(`Start ${service.constructor.name}...`);
            await service.start();
            Logger_1.Logger.info(`The ${service.constructor.name} done!`);
        }
        Logger_1.Logger.info('Start services done!');
    }
    async stopNested() {
        Logger_1.Logger.info('Cleanup...');
        for (let service of this.nestedServices.reverse()) {
            Logger_1.Logger.info(`Stop ${service.constructor.name}...`);
            if (!service.isDone()) {
                await service.stop();
            }
            Logger_1.Logger.info(`The ${service.constructor.name} done!`);
        }
        Logger_1.Logger.info('Cleanup done!');
    }
    stopOnExit() {
        process.on('SIGINT', this.stop.bind(this));
    }
    throwOnUnhandledPromiseRejection() {
        process.on('unhandledRejection', error => {
            Logger_1.Logger.error('Unhandled promise rejection:', error);
            process.exit(1);
        });
    }
    async iteration(...args) {
        throw 'Empty iteration body';
    }
    startLoop(firstIterationTimeout = 0, interval = Infinity) {
        setTimeout(async () => {
            await this.runIteration();
            this.loopId = setInterval(async () => {
                await this.runIteration();
            }, interval);
        }, firstIterationTimeout);
    }
    stopLoop() {
        clearInterval(this.loopId);
    }
    printEnvBasedConfig(serviceEnv = {}) {
        Logger_1.Logger.info('ENV-based config:');
        Logger_1.Logger.info('Core config params:');
        Logger_1.Logger.info('---');
        for (let key of Object.keys(env_1.envs)) {
            Logger_1.Logger.info(`${key} = ${env_1.envs[key]}`);
        }
        Logger_1.Logger.info('---');
        Logger_1.Logger.info('Service config params:');
        Logger_1.Logger.info('---');
        for (let key of Object.keys(serviceEnv)) {
            Logger_1.Logger.info(`${key} = ${serviceEnv[key]}`);
        }
        Logger_1.Logger.info('---');
    }
    getEmitter() {
        return this.emitter;
    }
    emit(name, ...data) {
        this.emitter.emit(name, ...data);
    }
    translateEmit(from, ...events) {
        if (!Array.isArray(from)) {
            from = [from];
        }
        const normalizedFrom = from;
        for (let target of normalizedFrom) {
            for (let event of events) {
                target.on(event, (...args) => this.emit(event, ...args));
            }
        }
    }
    on(name, callback) {
        this.emitter.on(name, callback);
    }
    once(name, callback) {
        this.emitter.once(name, callback);
    }
    async runIteration() {
        if (this.allowParallelIterations) {
            await this.handleIteration();
            return;
        }
        if (this.exclusiveIterationInProcess) {
            return;
        }
        this.exclusiveIterationInProcess = true;
        try {
            await this.handleIteration();
        }
        finally {
            this.exclusiveIterationInProcess = false;
        }
    }
    async handleIteration() {
        if (this.throwOnIterationError) {
            await this.iteration();
            return;
        }
        try {
            await this.iteration();
        }
        catch (error) {
            Logger_1.Logger.error('Iteration fail - ', error);
        }
    }
}
exports.Basic = Basic;
//# sourceMappingURL=Basic.js.map